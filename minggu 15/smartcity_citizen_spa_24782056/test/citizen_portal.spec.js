// =============================================================================
// FILE: citizen_portal.spec.js — E2E Test Suite Playwright FINAL
// Jumlah test: 9 (AUTH-04 s/d AUTH-06, UI-01 s/d UI-06)
// =============================================================================

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:8000';
const SPA_URL = 'http://127.0.0.1:5500/index.html';

const EXPIRED_ACCESS_TOKEN = 'expired.access.token';
const EXPIRED_REFRESH_TOKEN = 'expired.refresh.token';
const VALID_ACCESS_TOKEN = 'valid.access.token';
const VALID_REFRESH_TOKEN = 'valid.refresh.token';

function makeReports(total = 25) {
    const statuses = ['DRAFT', 'REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'];

    return Array.from({ length: total }, (_, index) => {
        const id = index + 1;
        return {
            id,
            title: `Laporan Test ${id}`,
            category: id % 2 === 0 ? 'Infrastruktur' : 'Kebersihan',
            description: `Deskripsi laporan test nomor ${id}`,
            location: `Lokasi Test ${id}`,
            status: statuses[id % statuses.length],
            reporter: 'Warga Anonim',
            reporter_name: 'Warga Anonim',
            is_owner: id % 3 === 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    });
}

async function setupAuthTokens(page, accessToken = VALID_ACCESS_TOKEN, refreshToken = VALID_REFRESH_TOKEN, username = 'testwarga') {
    await page.addInitScript(({ access, refresh, user }) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('username', user);
    }, {
        access: accessToken,
        refresh: refreshToken,
        user: username
    });
}

async function clearAuthTokens(page) {
    await page.addInitScript(() => {
        localStorage.clear();
    });
}

async function mockReportApi(page, totalReports = 25) {
    const allReports = makeReports(totalReports);

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());

        if (url.pathname.includes('/api/report/') && method === 'POST' && !url.pathname.includes('/submit/')) {
            const payload = request.postDataJSON() || {};

            return route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 999,
                    title: payload.title || 'Draft Test',
                    category: payload.category || 'Infrastruktur',
                    description: payload.description || 'Deskripsi test',
                    location: payload.location || 'Lokasi test',
                    status: 'DRAFT',
                    reporter: 'testwarga',
                    reporter_name: 'testwarga',
                    is_owner: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });
        }

        if (url.pathname.includes('/api/report/') && method === 'POST' && url.pathname.includes('/submit/')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 999,
                    status: 'REPORTED'
                })
            });
        }

        if (url.pathname.includes('/api/report/') && method === 'GET') {
            const pageNumber = Number(url.searchParams.get('page') || '1');
            const pageSize = Number(url.searchParams.get('page_size') || '10');
            const tab = url.searchParams.get('tab') || 'feed';

            let data = allReports;

            if (tab === 'my_reports') {
                data = allReports.map((item, index) => ({
                    ...item,
                    is_owner: true,
                    reporter_name: 'testwarga',
                    reporter: 'testwarga',
                    status: index === 0 ? 'DRAFT' : item.status
                }));
            } else {
                data = allReports.filter(item => item.status !== 'DRAFT');
            }

            const start = (pageNumber - 1) * pageSize;
            const results = data.slice(start, start + pageSize);

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    count: data.length,
                    next: start + pageSize < data.length ? 'next' : null,
                    previous: pageNumber > 1 ? 'previous' : null,
                    results
                })
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({})
        });
    });
}

async function mockUnauthorizedApi(page) {
    await page.route('**/api/**', async (route) => {
        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
                detail: 'Token is invalid or expired',
                code: 'token_not_valid'
            })
        });
    });
}

async function openDashboardWithMock(page) {
    await mockReportApi(page);
    await setupAuthTokens(page);
    page.on('dialog', async dialog => dialog.accept());
    await page.goto(`${SPA_URL}#dashboard`);
    await page.waitForLoadState('domcontentloaded');
}

test.describe('Modul 1: Otorisasi dan Sesi SPA', () => {
    test('AUTH-04: Akses dashboard tanpa token menampilkan form login', async ({ page }) => {
        await clearAuthTokens(page);

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveURL(/#login/);
    });

    test('AUTH-05: Token kadaluarsa ditangani tanpa aplikasi crash', async ({ page }) => {
        await setupAuthTokens(page, EXPIRED_ACCESS_TOKEN, EXPIRED_REFRESH_TOKEN);
        await mockUnauthorizedApi(page);

        page.on('dialog', async dialog => dialog.accept());

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

        const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
        expect(accessToken).toBeNull();
    });

    test('AUTH-06: Kedua token kadaluarsa membersihkan sesi dan kembali login', async ({ page }) => {
        await setupAuthTokens(page, EXPIRED_ACCESS_TOKEN, EXPIRED_REFRESH_TOKEN);
        await mockUnauthorizedApi(page);

        page.on('dialog', async dialog => dialog.accept());

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

        const tokens = await page.evaluate(() => ({
            access: localStorage.getItem('access_token'),
            refresh: localStorage.getItem('refresh_token'),
            username: localStorage.getItem('username')
        }));

        expect(tokens.access).toBeNull();
        expect(tokens.refresh).toBeNull();
        expect(tokens.username).toBeNull();
    });
});

test.describe('Modul 5: Interaktivitas UI', () => {
    test('UI-01: Dashboard citizen berhasil ter-render', async ({ page }) => {
        await openDashboardWithMock(page);

        await expect(page.locator('.navbar')).toBeVisible();
        await expect(page.locator('.navbar-brand')).toContainText(/Citizen Issue Hub/i);

        const createButton = page.locator('.create-button, #btnBukaModal').first();
        await expect(createButton).toBeVisible({ timeout: 10000 });

        const reportArea = page.locator('#reportList, #listContainer').first();
        await expect(reportArea).toBeVisible({ timeout: 10000 });
    });

    test('UI-02: Live search pada halaman reports dapat menerima input', async ({ page }) => {
        await page.goto(`${BASE_URL}/reports/`);

        const searchInput = page.locator('#searchInput');
        await expect(searchInput).toBeVisible({ timeout: 10000 });

        await searchInput.fill('Lampu');
        await expect(searchInput).toHaveValue('Lampu');
    });

    test('UI-03: Daftar laporan feed menampilkan maksimal 10 kartu pada halaman pertama', async ({ page }) => {
        await openDashboardWithMock(page);

        const feedTab = page.locator('#feedTab, #tabFeedKota, button:has-text("Feed")').first();

        if (await feedTab.count()) {
            await feedTab.click();
        }

        const cards = page.locator('.report-card, #listContainer .col');
        await expect(cards.first()).toBeVisible({ timeout: 10000 });

        const count = await cards.count();

        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(10);
    });

    test('UI-04: Tombol tambah laporan membuka modal', async ({ page }) => {
        await openDashboardWithMock(page);

        const createButton = page.locator('.create-button, #btnBukaModal').first();
        await expect(createButton).toBeVisible({ timeout: 10000 });

        await createButton.click();

        const modal = page.locator('#reportModal');
        await expect(modal).toBeVisible({ timeout: 10000 });

        await expect(page.locator('#reportForm')).toBeVisible();
        await expect(page.locator('#reportTitle, #inputTitle').first()).toBeVisible();
        await expect(page.locator('#reportCategory, #inputCategory').first()).toBeVisible();
        await expect(page.locator('#reportLocation, #inputLocation').first()).toBeVisible();
        await expect(page.locator('#reportDescription, #inputDescription').first()).toBeVisible();
    });

    test('UI-05: Isi form dan simpan draft berjalan tanpa error', async ({ page }) => {
        await openDashboardWithMock(page);

        let dialogMessage = '';
        page.on('dialog', async dialog => {
            dialogMessage = dialog.message();
            await dialog.accept();
        });

        await page.locator('.create-button, #btnBukaModal').first().click();
        await expect(page.locator('#reportModal')).toBeVisible({ timeout: 10000 });

        await page.locator('#reportTitle, #inputTitle').first().fill('AC Mati di Lab CPS 1');

        const categoryInput = page.locator('#reportCategory, #inputCategory').first();
        const tagName = await categoryInput.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'select') {
            await categoryInput.selectOption({ index: 1 });
        } else {
            await categoryInput.fill('Infrastruktur');
        }

        await page.locator('#reportLocation, #inputLocation').first().fill('Gedung Lab Analisis');
        await page.locator('#reportDescription, #inputDescription').first().fill('AC tidak berfungsi dan mengganggu praktikum.');

        await page.locator('#saveDraftButton, #btnDraft').first().click();

        await expect(page.locator('#reportModal')).not.toBeVisible({ timeout: 10000 });

        expect(dialogMessage === '' || dialogMessage.toLowerCase().includes('berhasil')).toBeTruthy();
    });

    test('UI-06: Responsive navbar pada viewport mobile', async ({ page }) => {
        await page.setViewportSize({ width: 400, height: 800 });

        await page.goto(SPA_URL);
        await page.waitForLoadState('domcontentloaded');

        const navbar = page.locator('.navbar');
        await expect(navbar).toBeVisible({ timeout: 5000 });

        const box = await navbar.boundingBox();

        expect(box).not.toBeNull();
        expect(box.width).toBeLessThanOrEqual(420);

        await page.setViewportSize({ width: 1280, height: 720 });
    });
});