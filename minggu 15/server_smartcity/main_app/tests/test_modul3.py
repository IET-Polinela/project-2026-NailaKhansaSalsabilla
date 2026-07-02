from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

from main_app.models import Report

User = get_user_model()


# =============================================================================
# MODUL 3: PENGUJIAN ALUR KERJA & ATURAN BISNIS STATUS LAPORAN
# =============================================================================

class WorkflowStateTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_wf',
            password='TestPass123!',
            is_admin=False
        )

        self.laporan_draft = Report.objects.create(
            title='Lampu Kampus Mati',
            category='Fasilitas Umum',
            description='Lampu di depan gedung rektorat tidak menyala.',
            location='Gedung Rektorat',
            status='DRAFT',
            reporter=self.warga,
        )

        self.laporan_reported = Report.objects.create(
            title='Saluran Air Tersumbat',
            category='Infrastruktur',
            description='Saluran air di samping kantin tersumbat.',
            location='Kantin Polinela',
            status='REPORTED',
            reporter=self.warga,
        )

        self.laporan_resolved = Report.objects.create(
            title='AC Rusak di Lab',
            category='Fasilitas Umum',
            description='AC di Lab CPS 1 sudah diperbaiki.',
            location='Lab CPS 1',
            status='RESOLVED',
            reporter=self.warga,
        )

    def test_WF_01_warga_mengajukan_draf_menjadi_reported(self):
        self.client.force_authenticate(user=self.warga)

        response = self.client.post(f'/api/report/{self.laporan_draft.pk}/submit/')

        self.laporan_draft.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.laporan_draft.status, 'REPORTED')

    def test_WF_02_tidak_bisa_edit_laporan_yang_sudah_reported(self):
        self.client.force_authenticate(user=self.warga)

        response = self.client.patch(
            f'/api/report/{self.laporan_reported.pk}/',
            {'title': 'Judul Reported Diubah'},
            format='json'
        )

        self.laporan_reported.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.laporan_reported.title, 'Saluran Air Tersumbat')

    def test_WF_05_laporan_resolved_tidak_bisa_diubah(self):
        self.client.force_authenticate(user=self.warga)

        response = self.client.patch(
            f'/api/report/{self.laporan_resolved.pk}/',
            {'description': 'Deskripsi resolved diubah'},
            format='json'
        )

        self.laporan_resolved.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.laporan_resolved.description, 'AC di Lab CPS 1 sudah diperbaiki.')


# =============================================================================
# MODUL 3b: PENGUJIAN ADMIN PORTAL — TRANSISI STATUS
# =============================================================================

class AdminWorkflowTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_portal',
            password='AdminPass123!',
            is_admin=True,
            is_staff=True,
        )

        self.warga = User.objects.create_user(
            username='warga_admin_wf',
            password='TestPass123!',
            is_admin=False
        )

        self.laporan_reported = Report.objects.create(
            title='Jalan Rusak di Blok C',
            category='Infrastruktur',
            description='Jalan berlubang parah di area parkir Blok C.',
            location='Blok C Polinela',
            status='REPORTED',
            reporter=self.warga,
        )

    def test_WF_03_admin_mengubah_status_reported_ke_verified(self):
        self.client.login(username='admin_portal', password='AdminPass123!')

        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.laporan_reported.pk}),
            {'status': 'VERIFIED'}
        )

        self.laporan_reported.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertEqual(self.laporan_reported.status, 'VERIFIED')

    def test_WF_04_tidak_ada_transisi_langsung_ke_resolved_dari_reported(self):
        self.client.login(username='admin_portal', password='AdminPass123!')

        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Verified')
        self.assertNotContains(response, 'Resolved</button>')