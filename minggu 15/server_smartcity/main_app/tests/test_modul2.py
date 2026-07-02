from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from main_app.models import Report

User = get_user_model()


# =============================================================================
# MODUL 2: PENGUJIAN VISIBILITAS DATA & PRIVASI PELAPOR
# =============================================================================

class PrivacyAndDataHidingTests(APITestCase):
    def setUp(self):
        self.warga_a = User.objects.create_user(
            username='warga_a',
            password='TestPass123!',
            is_admin=False
        )

        self.warga_b = User.objects.create_user(
            username='warga_b',
            password='TestPass123!',
            is_admin=False
        )

        self.draft_milik_b = Report.objects.create(
            title='Draf Rahasia Warga B',
            category='Infrastruktur',
            description='Ini adalah draf yang belum diajukan.',
            location='Lokasi Rahasia',
            status='DRAFT',
            reporter=self.warga_b,
        )

        self.laporan_publik_a = Report.objects.create(
            title='Jalan Berlubang di Depan Kampus',
            category='Infrastruktur',
            description='Ada lubang besar yang membahayakan pengendara.',
            location='Jl. Soekarno Hatta',
            status='REPORTED',
            reporter=self.warga_a,
        )

        self.laporan_publik_b = Report.objects.create(
            title='Sampah Menumpuk di Trotoar',
            category='Kebersihan',
            description='Sampah tidak diangkut selama seminggu.',
            location='Jl. Gatot Subroto',
            status='REPORTED',
            reporter=self.warga_b,
        )

    def _get_results(self, response):
        if isinstance(response.data, dict) and 'results' in response.data:
            return response.data['results']
        return response.data

    def test_PRIV_01_feed_kota_menyembunyikan_identitas_reporter(self):
        self.client.force_authenticate(user=self.warga_a)

        response = self.client.get('/api/report/?tab=feed&page_size=1000')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = self._get_results(response)
        self.assertTrue(len(results) > 0)

        laporan_warga_b = [
            laporan for laporan in results
            if laporan['title'] == 'Sampah Menumpuk di Trotoar'
        ]

        self.assertEqual(len(laporan_warga_b), 1)
        self.assertEqual(laporan_warga_b[0]['reporter'], 'Warga Anonim')
        self.assertEqual(laporan_warga_b[0]['reporter_name'], 'Warga Anonim')

    def test_PRIV_02_laporan_saya_menampilkan_nama_asli(self):
        self.client.force_authenticate(user=self.warga_a)

        response = self.client.get('/api/report/?tab=my_reports&page_size=1000')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = self._get_results(response)
        self.assertTrue(len(results) > 0)

        for laporan in results:
            self.assertEqual(laporan['reporter_name'], 'warga_a')
            self.assertTrue(laporan['is_owner'])

    def test_PRIV_03_tidak_bisa_baca_draf_orang_lain(self):
        self.client.force_authenticate(user=self.warga_a)

        response = self.client.get(f'/api/report/{self.draft_milik_b.pk}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_PRIV_04_tidak_bisa_modifikasi_draf_orang_lain(self):
        self.client.force_authenticate(user=self.warga_a)

        payload = {
            'title': 'Draf Orang Lain Diubah',
            'category': 'Infrastruktur',
            'description': 'Percobaan mengubah draf orang lain.',
            'location': 'Lokasi Baru',
            'status': 'DRAFT',
        }

        response = self.client.put(
            f'/api/report/{self.draft_milik_b.pk}/',
            payload,
            format='json'
        )

        self.draft_milik_b.refresh_from_db()

        self.assertIn(response.status_code, [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND
        ])
        self.assertEqual(self.draft_milik_b.title, 'Draf Rahasia Warga B')