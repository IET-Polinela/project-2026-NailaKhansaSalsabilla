from django.db.models import Q
from rest_framework import viewsets, permissions
from .models import Report
from .serializers import ReportSerializer, ReportStatusSerializer
from .permissions import IsCitizen, IsAdminOrOwnerAndDraft, IsOwnerAndDraftOnly, is_admin_user


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.all().order_by('id')

        if not user.is_authenticated:
            return Report.objects.none()

        if self.action in ['update', 'partial_update', 'destroy']:
            return queryset

        if is_admin_user(user):
            return queryset.exclude(status='DRAFT')

        return queryset.filter(
            Q(status__in=['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']) |
            Q(reporter=user)
        )

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update'] and is_admin_user(self.request.user):
            return ReportStatusSerializer

        return ReportSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsCitizen()]

        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsAdminOrOwnerAndDraft()]

        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsOwnerAndDraftOnly()]

        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user, status='DRAFT')