from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


# =============================================================================
# MODUL 1: PENGUJIAN OTORISASI & MANAJEMEN SESI
# =============================================================================

class AuthenticationTests(APITestCase):
    def setUp(self):
        self.warga = User.objects.create_user(
            username='warga_test',
            password='Password123!',
            is_admin=False
        )

        self.admin = User.objects.create_user(
            username='admin_test',
            password='AdminPass123!',
            is_admin=True,
            is_staff=True
        )

    def test_AUTH_01_login_warga_dengan_kredensial_valid(self):
        url = reverse('token_obtain_pair')

        payload = {
            'username': 'warga_test',
            'password': 'Password123!',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_AUTH_02_login_warga_dengan_password_salah(self):
        url = reverse('token_obtain_pair')

        payload = {
            'username': 'warga_test',
            'password': 'passwordSALAH',
        }

        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    def test_AUTH_03_warga_tidak_bisa_akses_halaman_admin(self):
        self.client.login(username='warga_test', password='Password123!')

        response = self.client.get('/dashboard/')

        self.assertIn(response.status_code, [302, 403])
        self.assertNotEqual(response.status_code, 200)