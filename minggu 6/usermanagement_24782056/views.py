from django.contrib import messages
from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect, render
from django.urls import reverse_lazy

from .forms import CustomUserCreationForm


class CustomLoginView(LoginView):
    template_name = 'usermanagement_24782056/login.html'
    redirect_authenticated_user = True

    def form_valid(self, form):
        messages.success(self.request, 'Login berhasil.')
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, 'Username atau password salah.')
        return super().form_invalid(form)


class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('login')

    def dispatch(self, request, *args, **kwargs):
        messages.success(request, 'Logout berhasil.')
        return super().dispatch(request, *args, **kwargs)


def register_view(request):
    if request.user.is_authenticated:
        return redirect('report_list')

    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Registrasi berhasil. Silakan login.')
            return redirect('login')
    else:
        form = CustomUserCreationForm()

    return render(request, 'usermanagement_24782056/register.html', {'form': form})