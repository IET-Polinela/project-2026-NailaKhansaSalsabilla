const { test, expect } = require('@playwright/test');

const SPA_URL = 'http://localhost:5500/index.html';

function makeReports(total = 25) {
    const statuses = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'];

    return Array.from({ length: total }, (_, index) => {
        const id = index + 1;

        return {
            id,
            title: `Laporan Test ${id}`,
            category: id % 2 === 0 ? 'Infrastruktur' : 'Kebersihan',
            description: `Deskripsi laporan test nomor ${id}`,
            location: `Lokasi Test ${id}`,
            status: statuses[index % statuses.length],
            reporter: 'Warga Anonim',
            reporter_name: 'Warga Anonim',
            is_owner: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    });
}

async function mockApi(page, options = {}) {
    const reports = options.reports || makeReports(25);
    const force401 = options.force401 || false;
    const adminMode = options.adminMode || false;
    const includeDraft = options.includeDraft || false;

    await page.route('**/api/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = request.url();

        if (force401) {
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    detail: 'Token invalid atau expired',
                }),
            });
            return;
        }

        if (url.includes('/api/token/') && method === 'POST') {
            const body = request.postDataJSON();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access: 'fake-access-token',
                    refresh: 'fake-refresh-token',
                    role: body.username === 'khansa' ? 'admin' : 'citizen',
                    user_role: body.username === 'khansa' ? 'admin' : 'citizen',
                }),
            });
            return;
        }

        if (url.includes('/api/report/') && method === 'POST') {
            const body = request.postDataJSON();

            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 999,
                    title: body.title,
                    category: body.category,
                    description: body.description,
                    location: body.location,
                    status: body.status || 'DRAFT',
                    reporter: 'Warga Anonim',
                    reporter_name: 'testwarga',
                    is_owner: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
            });
            return;
        }

        if (url.includes('/api/report/') && method === 'PUT') {
            const body = request.postDataJSON();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 888,
                    title: body.title,
                    category: body.category,
                    description: body.description,
                    location: body.location,
                    status: body.status || 'DRAFT',
                    reporter: 'Warga Anonim',
                    reporter_name: 'testwarga',
                    is_owner: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
            });
            return;
        }

        if (url.includes('/submit/') && method === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 888,
                    title: 'Draft Terkirim',
                    category: 'Infrastruktur',
                    description: 'Draft berhasil dikirim.',
                    location: 'Lokasi Draft',
                    status: 'REPORTED',
                    reporter: 'Warga Anonim',
                    reporter_name: 'testwarga',
                    is_owner: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
            });
            return;
        }

        if (url.includes('/api/report/') && method === 'GET') {
            const parsedUrl = new URL(url);
            const tab = parsedUrl.searchParams.get('tab') || 'my_reports';
            const pageNumber = Number(parsedUrl.searchParams.get('page') || 1);
            const pageSize = Number(parsedUrl.searchParams.get('page_size') || 10);

            let data = [];

            if (adminMode && tab === 'my_reports') {
                data = [];
            } else if (tab === 'feed') {
                data = reports.filter((report) => report.status !== 'DRAFT');
            } else if (tab === 'my_reports') {
                if (includeDraft) {
                    data = [
                        {
                            id: 888,
                            title: 'Draft Laporan Saya',
                            category: 'Infrastruktur',
                            description: 'Draft milik user login',
                            location: 'Lokasi Draft',
                            status: 'DRAFT',
                            reporter: 'Warga Anonim',
                            reporter_name: 'testwarga',
                            is_owner: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    ];
                } else {
                    data = reports.slice(0, 3).map((report) => ({
                        ...report,
                        is_owner: true,
                        reporter_name: 'testwarga',
                    }));
                }
            } else {
                data = reports;
            }

            if (url.includes('page_size=1000')) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        count: data.length,
                        results: data,
                    }),
                });
                return;
            }

            const start = (pageNumber - 1) * pageSize;
            const end = start + pageSize;

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    count: data.length,
                    next: end < data.length ? 'next-page' : null,
                    previous: pageNumber > 1 ? 'previous-page' : null,
                    results: data.slice(start, end),
                }),
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                count: 0,
                results: [],
            }),
        });
    });
}

async function prepareLoggedInPage(page, username = 'testwarga', role = 'citizen') {
    await page.addInitScript(
        ({ username, role }) => {
            localStorage.clear();
            localStorage.setItem('api_base_url', 'http://127.0.0.1:8000');
            localStorage.setItem('access_token', 'fake-access-token');
            localStorage.setItem('refresh_token', 'fake-refresh-token');
            localStorage.setItem('username', username);
            localStorage.setItem('role', role);
            localStorage.setItem('user_role', role);
        },
        { username, role }
    );
}

test.describe('Modul 1: Otorisasi dan Sesi SPA', () => {
    test('AUTH-04: Akses dashboard tanpa token menampilkan form login', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
        });

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#username')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
    });

    test('AUTH-05: Access token expired membuat storage dibersihkan', async ({ page }) => {
        await mockApi(page, { force401: true });

        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem('api_base_url', 'http://127.0.0.1:8000');
            localStorage.setItem('access_token', 'expired-access-token');
            localStorage.setItem('refresh_token', 'valid-refresh-token');
            localStorage.setItem('username', 'testwarga');
            localStorage.setItem('role', 'citizen');
            localStorage.setItem('user_role', 'citizen');
        });

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

        const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
        const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));

        expect(accessToken).toBeNull();
        expect(refreshToken).toBeNull();
    });

    test('AUTH-06: Access dan refresh token expired membuat user kembali ke login', async ({ page }) => {
        await mockApi(page, { force401: true });

        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem('api_base_url', 'http://127.0.0.1:8000');
            localStorage.setItem('access_token', 'expired-access-token');
            localStorage.setItem('refresh_token', 'expired-refresh-token');
            localStorage.setItem('username', 'testwarga');
            localStorage.setItem('role', 'citizen');
            localStorage.setItem('user_role', 'citizen');
        });

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

        const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
        const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
        const username = await page.evaluate(() => localStorage.getItem('username'));

        expect(accessToken).toBeNull();
        expect(refreshToken).toBeNull();
        expect(username).toBeNull();
    });
});

test.describe('Modul 5: Interaktivitas UI Citizen Portal', () => {
    test('UI-01: Halaman login SPA berhasil tampil', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
        });

        await page.goto(SPA_URL);

        await expect(page.locator('.navbar')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.navbar-brand')).toContainText('Citizen Issue Hub');
        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#username')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
    });

    test('UI-02: Login form menerima input username dan password', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
        });

        await page.goto(SPA_URL);

        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

        await page.locator('#username').fill('testwarga');
        await page.locator('#password').fill('testpassword123');

        await expect(page.locator('#username')).toHaveValue('testwarga');
        await expect(page.locator('#password')).toHaveValue('testpassword123');
    });

    test('UI-03: Feed Kota menampilkan maksimal 10 kartu pada halaman awal', async ({ page }) => {
        await mockApi(page);
        await prepareLoggedInPage(page, 'testwarga', 'citizen');

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#feedTab')).toBeVisible({ timeout: 10000 });
        await page.locator('#feedTab').click();

        await expect(page.locator('#reportList .report-card').first()).toBeVisible({ timeout: 10000 });

        const cardCount = await page.locator('#reportList .report-card').count();

        expect(cardCount).toBeGreaterThan(0);
        expect(cardCount).toBeLessThanOrEqual(10);
    });

    test('UI-04: Tombol Buat Laporan Baru membuka modal form', async ({ page }) => {
        await mockApi(page);
        await prepareLoggedInPage(page, 'testwarga', 'citizen');

        await page.goto(`${SPA_URL}#dashboard`);

        const createButton = page.locator('.create-button');
        await expect(createButton).toBeVisible({ timeout: 10000 });

        await expect(page.locator('#reportModal')).not.toBeVisible();

        await createButton.click();

        await expect(page.locator('#reportModal')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#reportTitle')).toBeVisible();
        await expect(page.locator('#reportCategory')).toBeVisible();
        await expect(page.locator('#reportLocation')).toBeVisible();
        await expect(page.locator('#reportDescription')).toBeVisible();
        await expect(page.locator('#saveDraftButton')).toBeVisible();
        await expect(page.locator('#submitReportButton')).toBeVisible();
    });

    test('UI-05: Simpan draft melalui modal menutup modal dan menaikkan badge draft', async ({ page }) => {
        await mockApi(page, { includeDraft: true });
        await prepareLoggedInPage(page, 'testwarga', 'citizen');

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('.create-button')).toBeVisible({ timeout: 10000 });
        await page.locator('.create-button').click();

        await expect(page.locator('#reportModal')).toBeVisible({ timeout: 10000 });

        await page.locator('#reportTitle').fill('AC Mati di Lab CPS 1');
        await page.locator('#reportCategory').fill('Infrastruktur');
        await page.locator('#reportLocation').fill('Gedung Lab Analisis');
        await page.locator('#reportDescription').fill('AC di ruangan tidak menyala dan perlu diperbaiki.');

        await page.locator('#saveDraftButton').click();

        await expect(page.locator('#reportModal')).not.toBeVisible({ timeout: 10000 });
        await expect(page.locator('#statDraft')).toBeVisible({ timeout: 10000 });

        const draftText = await page.locator('#statDraft').textContent();
        const draftCount = Number(draftText.trim());

        expect(draftCount).toBeGreaterThanOrEqual(1);
    });

    test('UI-06: Tampilan tetap responsif pada ukuran mobile 400x800', async ({ page }) => {
        await page.setViewportSize({ width: 400, height: 800 });

        await page.addInitScript(() => {
            localStorage.clear();
        });

        await page.goto(SPA_URL);

        const navbar = page.locator('.navbar');
        await expect(navbar).toBeVisible({ timeout: 10000 });

        const navbarBox = await navbar.boundingBox();

        expect(navbarBox).not.toBeNull();
        expect(navbarBox.width).toBeLessThanOrEqual(400);

        await expect(page.locator('.navbar-brand')).toBeVisible();
        await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });
    });

    test('UI-07: Admin frontend tidak memiliki tombol buat laporan dan Laporan Saya kosong', async ({ page }) => {
        await mockApi(page, { adminMode: true });
        await prepareLoggedInPage(page, 'khansa', 'admin');

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('.create-button')).toHaveCount(0);

        await expect(page.locator('#myReportsTab')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#feedTab')).toBeVisible();

        await page.locator('#myReportsTab').click();

        await expect(page.locator('#reportList')).toContainText('Laporan Saya kosong', {
            timeout: 10000,
        });

        await page.locator('#feedTab').click();

        await expect(page.locator('#reportList .report-card').first()).toBeVisible({
            timeout: 10000,
        });

        const cardCount = await page.locator('#reportList .report-card').count();

        expect(cardCount).toBeGreaterThan(0);
        expect(cardCount).toBeLessThanOrEqual(10);
    });

    test('UI-08: Navbar dan halaman utama frontend berhasil tampil', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
        });

        await page.goto(SPA_URL);

        await expect(page.locator('.navbar')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.navbar-brand')).toContainText('Citizen Issue Hub');
        await expect(page.locator('#app-content')).toBeVisible();
    });

    test('UI-09: Tombol logout muncul ketika user sudah login', async ({ page }) => {
        await mockApi(page);
        await prepareLoggedInPage(page, 'testwarga', 'citizen');

        await page.goto(`${SPA_URL}#dashboard`);

        await expect(page.locator('#logoutButton')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#userGreeting')).toContainText('testwarga');
    });
});