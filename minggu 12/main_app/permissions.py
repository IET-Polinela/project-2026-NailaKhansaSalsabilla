from rest_framework import permissions


def is_admin_user(user):
    return bool(
        user and
        user.is_authenticated and
        (
            user.is_admin or
            user.is_staff or
            user.is_superuser
        )
    )


class IsCitizen(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_member
        )


class IsAdminOrOwnerAndDraft(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if is_admin_user(request.user):
            return True

        return obj.reporter == request.user and obj.status == 'DRAFT'


class IsOwnerAndDraftOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.reporter == request.user and obj.status == 'DRAFT'