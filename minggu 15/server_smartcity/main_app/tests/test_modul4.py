from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from main_app.models import Report

User = get_user_model()


class CRUDAndValidationTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_crud',
            password='TestPass123!',
            is_admin=False,
            is_staff=False,
            is_member=True,
        )

        self.client.force_authenticate(user=self.warga)

    def test_FT_01_buat_laporan_dengan_data_lengkap(self):
        # Arrange
        url = reverse('report-list')
        payload = {
            'title': 'Laporan Jalan Rusak',
            'category': 'Infrastruktur',
            'description': 'Jalan rusak dan berlubang di dekat pasar.',
            'location': 'Pasar Pulung Kencana',
            'status': 'DRAFT',
        }

        # Act
        response = self.client.post(url, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        report = Report.objects.get(title='Laporan Jalan Rusak')
        self.assertEqual(report.reporter, self.warga)
        self.assertEqual(report.status, 'DRAFT')
        self.assertEqual(report.category, 'Infrastruktur')

    def test_FT_02_ditolak_jika_judul_kosong(self):
        # Arrange
        url = reverse('report-list')
        payload = {
            'category': 'Infrastruktur',
            'description': 'Deskripsi tetap diisi.',
            'location': 'Lokasi Uji',
            'status': 'DRAFT',
        }

        # Act
        response = self.client.post(url, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_FT_03_ditolak_jika_deskripsi_kosong(self):
        # Arrange
        url = reverse('report-list')
        payload = {
            'title': 'Laporan Tanpa Deskripsi',
            'category': 'Infrastruktur',
            'location': 'Lokasi Uji',
            'status': 'DRAFT',
        }

        # Act
        response = self.client.post(url, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('description', response.data)

    def test_FT_04_xss_script_disimpan_sebagai_string_literal(self):
        # Arrange
        url = reverse('report-list')
        kode_xss = '<script>alert("xss")</script>'

        payload = {
            'title': 'Laporan XSS Test',
            'category': 'Keamanan',
            'description': kode_xss,
            'location': 'Lab Keamanan Siber',
            'status': 'DRAFT',
        }

        # Act
        response = self.client.post(url, payload, format='json')

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        laporan = Report.objects.get(title='Laporan XSS Test')
        self.assertIn('script', laporan.description.lower())
        self.assertEqual(laporan.description, kode_xss)