from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Role Fields', {'fields': ('is_admin', 'is_member')}),
    )

    list_display = (
        'username',
        'email',
        'is_staff',
        'is_superuser',
        'is_admin',
        'is_member',
    )