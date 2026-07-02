from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from main_app.models import Report
from main_app.serializers import ReportSerializer

User = get_user_model()


# =============================================================================
# ADDITIONAL TESTS FOR COVERAGE - DISESUAIKAN DENGAN ATURAN FINAL PROJECT
# =============================================================================

class SerializerAndModelCoverageTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_str_test',
            password='Password123!',
            is_admin=False
        )

    def test_report_model_str(self):
        report = Report.objects.create(
            title='Laporan Str Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga
        )

        self.assertEqual(str(report), 'Laporan Str Uji')

    def test_report_serializer_no_request_context(self):
        report = Report.objects.create(
            title='Laporan Serializer Uji',
            category='Lainnya',
            description='Deskripsi',
            location='Lokasi',
            status='REPORTED',
            reporter=self.warga
        )

        serializer = ReportSerializer(report, context={})

        self.assertFalse(serializer.data['is_owner'])
        self.assertEqual(serializer.data['reporter_name'], 'Warga Anonim')
        self.assertEqual(serializer.data['reporter'], 'Warga Anonim')


class MainAppMonolithicViewsCoverageTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_mono',
            password='Password123!',
            is_admin=True,
            is_staff=True
        )

        self.citizen = User.objects.create_user(
            username='citizen_mono',
            password='Password123!',
            is_admin=False,
            is_staff=False
        )

        self.report = Report.objects.create(
            title='Laporan Monolitik Uji',
            category='Infrastruktur',
            description='Ada kerusakan infrastruktur.',
            location='Bandung',
            status='REPORTED',
            reporter=self.citizen
        )

        self.draft = Report.objects.create(
            title='Draft Citizen Mono',
            category='Infrastruktur',
            description='Draft belum dikirim.',
            location='Bandung',
            status='DRAFT',
            reporter=self.citizen
        )

    def test_report_detail_api_valid(self):
        response = self.client.get(reverse('report_detail_json', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 200)

    def test_report_detail_api_invalid(self):
        response = self.client.get(reverse('report_detail_json', kwargs={'pk': 99999}))

        self.assertEqual(response.status_code, 404)

    def test_report_search_unauthenticated(self):
        response = self.client.get(reverse('report_search') + '?q=Monolitik')

        self.assertEqual(response.status_code, 200)

    def test_report_search_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('report_search') + '?q=Monolitik')

        self.assertEqual(response.status_code, 200)

    def test_report_search_admin(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('report_search') + '?q=Monolitik')

        self.assertEqual(response.status_code, 200)

    def test_home_view(self):
        response = self.client.get(reverse('home'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/home.html')

    def test_report_list_view_unauthenticated(self):
        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_list.html')
        self.assertContains(response, 'Laporan Monolitik Uji')
        self.assertNotContains(response, 'Draft Citizen Mono')

    def test_report_list_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_list.html')
        self.assertNotContains(response, 'Draft Citizen Mono')

    def test_report_list_view_admin(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('report_list'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_list.html')
        self.assertNotContains(response, 'Draft Citizen Mono')

    def test_report_create_view_unauthenticated(self):
        response = self.client.get(reverse('add_report'))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_create_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('add_report'))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_create_view_admin_get(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('add_report'))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_create_view_admin_post_valid(self):
        self.client.login(username='admin_mono', password='Password123!')

        before_count = Report.objects.count()

        payload = {
            'title': 'Laporan Form Baru',
            'category': 'Infrastruktur',
            'description': 'Deskripsi baru.',
            'location': 'Jakarta',
            'status': 'DRAFT'
        }

        response = self.client.post(reverse('add_report'), payload)

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertEqual(Report.objects.count(), before_count)
        self.assertFalse(Report.objects.filter(title='Laporan Form Baru').exists())

    def test_report_detail_view_unauthenticated(self):
        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'main_app/report_detail.html')

    def test_report_detail_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 200)

    def test_report_detail_view_admin(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('report_detail', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 200)

    def test_report_update_view_unauthenticated(self):
        response = self.client.get(reverse('update_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_update_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('update_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_update_view_admin_get(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('update_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_update_view_admin_post_valid(self):
        self.client.login(username='admin_mono', password='Password123!')

        original_title = self.report.title

        payload = {
            'title': 'Laporan Terupdate Oleh Admin',
            'category': 'Infrastruktur',
            'description': 'Deskripsi terupdate.',
            'location': 'Jakarta',
            'status': 'REPORTED'
        }

        response = self.client.post(reverse('update_report', kwargs={'pk': self.report.id}), payload)

        self.report.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertEqual(self.report.title, original_title)
        self.assertNotEqual(self.report.title, 'Laporan Terupdate Oleh Admin')

    def test_report_delete_view_unauthenticated(self):
        response = self.client.get(reverse('delete_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_delete_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.get(reverse('delete_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_delete_view_admin_get(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.get(reverse('delete_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))

    def test_report_delete_view_admin_post(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.post(reverse('delete_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertTrue(Report.objects.filter(id=self.report.id).exists())

    def test_report_delete_view_direct_delete_method(self):
        self.client.login(username='admin_mono', password='Password123!')

        response = self.client.post(reverse('delete_report', kwargs={'pk': self.report.id}))

        self.assertEqual(response.status_code, 302)
        self.assertTrue(Report.objects.filter(id=self.report.id).exists())

    def test_report_update_status_view_unauthenticated(self):
        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.report.id}),
            {'status': 'VERIFIED'}
        )

        self.report.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.report.status, 'REPORTED')

    def test_report_update_status_view_citizen(self):
        self.client.login(username='citizen_mono', password='Password123!')

        response = self.client.post(
            reverse('update_status', kwargs={'pk': self.report.id}),
            {'status': 'VERIFIED'}
        )

        self.report.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(response, reverse('report_list'))
        self.assertEqual(self.report.status, 'REPORTED')