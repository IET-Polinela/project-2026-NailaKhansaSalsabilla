from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from main_app.models import Report

User = get_user_model()


# =============================================================================
# MODUL 4: PENGUJIAN FUNGSIONALITAS DASAR & VALIDASI INPUT
# =============================================================================

class CRUDAndValidationTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_crud',
            password='TestPass123!',
            is_admin=False
        )

        self.client.force_authenticate(user=self.warga)

    def test_FT_01_buat_laporan_dengan_data_lengkap(self):
        url = reverse('report-list')

        payload = {
            'title': 'Laporan Data Lengkap',
            'category': 'Infrastruktur',
            'description': 'Jalan rusak di depan kantor desa.',
            'location': 'Kantor Desa',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        laporan = Report.objects.get(title='Laporan Data Lengkap')
        self.assertEqual(laporan.reporter, self.warga)
        self.assertEqual(laporan.status, 'DRAFT')

    def test_FT_02_ditolak_jika_judul_kosong(self):
        url = reverse('report-list')

        payload = {
            'category': 'Infrastruktur',
            'description': 'Deskripsi tetap diisi.',
            'location': 'Kantor Desa',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_FT_03_ditolak_jika_deskripsi_kosong(self):
        url = reverse('report-list')

        payload = {
            'title': 'Laporan Tanpa Deskripsi',
            'category': 'Infrastruktur',
            'location': 'Kantor Desa',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_FT_04_xss_script_disimpan_sebagai_string_literal(self):
        url = reverse('report-list')

        kode_xss = '<script>alert("xss")</script>'
        payload = {
            'title': 'Laporan XSS Test',
            'category': 'Keamanan',
            'description': kode_xss,
            'location': 'Lab Keamanan Siber',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        laporan = Report.objects.get(title='Laporan XSS Test')

        self.assertIn('script', laporan.description.lower())
        self.assertEqual(laporan.description, kode_xss)