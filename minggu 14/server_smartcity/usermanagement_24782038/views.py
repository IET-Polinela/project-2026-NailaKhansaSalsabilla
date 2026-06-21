from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import render, redirect
from django.urls import reverse_lazy

from rest_framework import generics
from rest_framework.permissions import AllowAny

from .forms import RegisterForm
from .models import User
from .serializers import RegisterSerializer


# =========================
# WEB AUTHENTICATION VIEW
# =========================

class CustomLoginView(LoginView):

    template_name = 'usermanagement_24782038/login.html'
    redirect_authenticated_user = True

    def form_valid(self, form):
        messages.success(self.request, 'Login berhasil.')
        return super().form_valid(form)

    def get_success_url(self):
        return reverse_lazy('landing')


class CustomLogoutView(LogoutView):

    next_page = reverse_lazy('landing')

    def dispatch(self, request, *args, **kwargs):
        messages.success(request, 'Logout berhasil.')
        return super().dispatch(request, *args, **kwargs)


def register_view(request):

    if request.user.is_authenticated:
        return redirect('landing')

    form = RegisterForm(request.POST or None)

    if request.method == 'POST':

        if form.is_valid():
            user = form.save()

            login(request, user)

            messages.success(request, 'Registrasi berhasil.')

            return redirect('landing')

    return render(
        request,
        'usermanagement_24782038/register.html',
        {'form': form}
    )


# =========================
# API REGISTER VIEW (LAB 10)
# =========================

class RegisterAPIView(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer

    permission_classes = [AllowAny]