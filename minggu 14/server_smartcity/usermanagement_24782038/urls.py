from django.urls import path

from .views import (
    register_view,
    CustomLoginView,
    CustomLogoutView,
    RegisterAPIView,
)

urlpatterns = [

    # Web Authentication
    path('register/', register_view, name='register'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', CustomLogoutView.as_view(), name='logout'),

    # API Register (Lab 10)
    path('api/register/', RegisterAPIView.as_view(), name='api-register'),
]