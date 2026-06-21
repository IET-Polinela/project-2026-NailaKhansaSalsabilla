from django.urls import path
from django.views.generic import RedirectView
from .views import CustomLoginView, CustomLogoutView, register_view

urlpatterns = [
    path('profile/', RedirectView.as_view(pattern_name='report_list', permanent=False), name='profile'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),
    path('register/', register_view, name='register'),
]
