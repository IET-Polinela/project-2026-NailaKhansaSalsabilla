from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from main_app.models import Report

User = get_user_model()


class SerializerAndModelCoverageTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_str_test',
            password='Password123!',
            is_admin=False,
            is_staff=False,
            is_member=True,
        )

    def test_report_model_str(self):
        report = Report.objects.create(
            title='Laporan Str Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga,
        )

        self.assertEqual(str(report), 'Laporan Str Uji')

    def test_report_serializer_no_request_context(self):
        from main_app.serializers import ReportSerializer

        report = Report.objects.create(
            title='Laporan Serializer Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga,
        )

        serializer = ReportSerializer(report, context={})
        data = serializer.data

        if 'is_owner' in data:
            self.assertFalse(data['is_owner'])

        if 'reporter' in data:
            self.assertEqual(data['reporter'], 'Warga Anonim')

        if 'reporter_name' in data:
            self.assertIn(data['reporter_name'], ['Warga Anonim', 'warga_str_test'])


class MainAppMonolithicViewsCoverageTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_mono',
            password='Password123!',
            is_admin=True,
            is_staff=True,
            is_member=False,
        )

        self.citizen = User.objects.create_user(
            username='citizen_mono',
            password='Password123!',
            is_admin=False,
            is_staff=False,
            is_member=True,
        )

        self.report = Report.objects.create(
            title='Laporan Monolitik Uji',
            category='Infrastruktur',
            description='Ada kerusakan infrastruktur.',
            location='Bandung',
            status='REPORTED',
            reporter=self.citizen,
        )

        self.draft = Report.objects.create(
            title='Draft Citizen Mono',
            category='Kebersihan',
            description='Draft masih bisa diedit.',
            location='Lampung',
            status='DRAFT',
            reporter=self.citizen,
        )

    def test_home_view(self):
        response = self.client.get(reverse('home'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/home.html')

    def test_report_list_view_unauthenticated_redirect(self):
        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 302)

    def test_report_list_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Draft Citizen Mono')
        self.assertContains(response, 'Laporan Monolitik Uji')

    def test_report_list_view_admin_tidak_melihat_draft(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Laporan Monolitik Uji')
        self.assertNotContains(response, 'Draft Citizen Mono')

    def test_add_report_view_unauthenticated_redirect(self):
        response = self.client.get(reverse('add_report'))

        self.assertEqual(response.status_code, 302)

    def test_add_report_view_citizen_ditolak_di_backend(self):
        self.client.login(username='citizen_mono', password='Password123!')

        payload = {
            'title': 'Tidak Boleh Dibuat dari Backend',
            'category': 'Uji',
            'description': 'Harus ditolak.',
            'location': 'Backend',
        }

        response = self.client.post(reverse('add_report'), payload)

        self.assertEqual(response.status_code, 302)
        self.assertFalse(
            Report.objects.filter(title='Tidak Boleh Dibuat dari Backend').exists()
        )

    def test_add_report_view_admin_ditolak_di_backend(self):
        self.client.login(username='admin_mono', password='Password123!')

        payload = {
            'title': 'Admin Tidak Boleh Buat Laporan',
            'category': 'Uji',
            'description': 'Harus ditolak.',
            'location': 'Backend',
        }

        response = self.client.post(reverse('add_report'), payload)

        self.assertEqual(response.status_code, 302)
        self.assertFalse(
            Report.objects.filter(title='Admin Tidak Boleh Buat Laporan').exists()
        )

    def test_report_detail_view_unauthenticated_redirect(self):
        response = self.client.get(
            reverse('report_detail', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 302)

    def test_report_detail_view_citizen_bisa_lihat_laporan_publik(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(
            reverse('report_detail', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.report.title)

    def test_report_detail_view_admin_bisa_lihat_laporan_non_draft(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(
            reverse('report_detail', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.report.title)

    def test_report_detail_view_admin_tidak_bisa_lihat_draft(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(
            reverse('report_detail', kwargs={'pk': self.draft.pk})
        )

        self.assertEqual(response.status_code, 404)

    def test_update_report_view_unauthenticated_redirect(self):
        response = self.client.get(
            reverse('update_report', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 302)

    def test_update_report_view_citizen_bisa_edit_draft_milik_sendiri(self):
        self.client.login(username='citizen_mono', password='Password123!')

        payload = {
            'title': 'Draft Citizen Mono Updated',
            'category': self.draft.category,
            'description': 'Draft berhasil diperbarui.',
            'location': self.draft.location,
        }

        response = self.client.post(
            reverse('update_report', kwargs={'pk': self.draft.pk}),
            payload,
        )

        self.assertEqual(response.status_code, 302)

        self.draft.refresh_from_db()
        self.assertEqual(self.draft.title, 'Draft Citizen Mono Updated')
        self.assertEqual(self.draft.status, 'DRAFT')

    def test_update_report_view_citizen_tidak_bisa_edit_laporan_reported(self):
        self.client.login(username='citizen_mono', password='Password123!')

        original_title = self.report.title

        payload = {
            'title': 'Citizen Edit Reported Ditolak',
            'category': self.report.category,
            'description': self.report.description,
            'location': self.report.location,
        }

        response = self.client.post(
            reverse('update_report', kwargs={'pk': self.report.pk}),
            payload,
        )

        self.assertEqual(response.status_code, 302)

        self.report.refresh_from_db()
        self.assertEqual(self.report.title, original_title)

    def test_update_report_view_admin_ditolak(self):
        self.client.login(username='admin_mono', password='Password123!')

        original_title = self.report.title

        payload = {
            'title': 'Admin Edit Ditolak',
            'category': self.report.category,
            'description': self.report.description,
            'location': self.report.location,
        }

        response = self.client.post(
            reverse('update_report', kwargs={'pk': self.report.pk}),
            payload,
        )

        self.assertIn(response.status_code, [302, 403])

        self.report.refresh_from_db()
        self.assertEqual(self.report.title, original_title)
        self.assertNotEqual(self.report.title, 'Admin Edit Ditolak')

    def test_delete_report_view_unauthenticated_redirect(self):
        response = self.client.get(
            reverse('delete_report', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 302)

    def test_delete_report_view_citizen_tidak_menghapus_laporan_reported(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.post(
            reverse('delete_report', kwargs={'pk': self.report.pk})
        )

        self.assertIn(response.status_code, [302, 403])
        self.assertTrue(Report.objects.filter(pk=self.report.pk).exists())

    def test_delete_report_view_admin_tidak_menghapus_data(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.post(
            reverse('delete_report', kwargs={'pk': self.report.pk})
        )

        self.assertIn(response.status_code, [302, 403])
        self.assertTrue(Report.objects.filter(pk=self.report.pk).exists())

    def test_update_status_citizen_kirim_draft_ke_reported(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.draft.pk}),
            {'status': 'REPORTED'},
        )

        self.assertEqual(response.status_code, 302)

        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, 'REPORTED')

    def test_update_status_citizen_tidak_bisa_verifikasi_reported(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.report.pk}),
            {'status': 'VERIFIED'},
        )

        self.assertEqual(response.status_code, 302)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, 'REPORTED')

    def test_update_status_admin_reported_ke_verified(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.report.pk}),
            {'status': 'VERIFIED'},
        )

        self.assertEqual(response.status_code, 302)

        self.report.refresh_from_db()
        self.assertEqual(self.report.status, 'VERIFIED')

    def test_report_search_json_admin(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('report_search') + '?q=Monolitik')

        self.assertEqual(response.status_code, 200)
        self.assertIn('reports', response.json())

    def test_report_detail_json_admin(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(
            reverse('report_detail_json', kwargs={'pk': self.report.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], self.report.title)