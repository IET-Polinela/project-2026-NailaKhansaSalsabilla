from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Report
from .serializers import ReportSerializer, ReportStatusSerializer
from .permissions import IsCitizen, IsAdminOrOwnerAndDraft, is_admin_user


NON_DRAFT_STATUSES = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']


class ReportPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000


class ReportViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    serializer_class = ReportSerializer
    pagination_class = ReportPagination

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.all().order_by('-updated_at')

        if not user.is_authenticated:
            return Report.objects.none()

        tab = self.request.query_params.get('tab')

        # ADMIN
        # Laporan Saya harus kosong.
        # Feed Kota hanya menampilkan laporan non-draft.
        if is_admin_user(user):
            if tab == 'my_reports':
                return Report.objects.none()

            if tab == 'feed':
                return queryset.exclude(status='DRAFT')

            return queryset.exclude(status='DRAFT')

        # CITIZEN
        # Laporan Saya menampilkan laporan milik user tersebut.
        # Feed Kota menampilkan laporan publik/non-draft.
        if tab == 'my_reports':
            return queryset.filter(reporter=user)

        if tab == 'feed':
            return queryset.exclude(status='DRAFT')

        return queryset.filter(
            Q(status__in=NON_DRAFT_STATUSES) |
            Q(reporter=user, status='DRAFT')
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

        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        requested_status = self.request.data.get('status')

        if requested_status == 'REPORTED':
            serializer.save(reporter=self.request.user, status='REPORTED')
        else:
            serializer.save(reporter=self.request.user, status='DRAFT')

    def perform_update(self, serializer):
        if is_admin_user(self.request.user):
            requested_status = self.request.data.get('status')

            if requested_status == 'DRAFT':
                serializer.save(status='REPORTED')
            else:
                serializer.save()

            return

        requested_status = self.request.data.get('status')

        if requested_status == 'REPORTED':
            serializer.save(status='REPORTED')
        else:
            serializer.save(status='DRAFT')

    @extend_schema(exclude=True)
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        report = self.get_object()

        if report.status != 'DRAFT':
            return Response(
                {'detail': 'Hanya laporan berstatus DRAFT yang dapat dikirim.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if report.reporter != request.user:
            return Response(
                {'detail': 'Anda hanya dapat mengirim draft milik sendiri.'},
                status=status.HTTP_403_FORBIDDEN
            )

        report.status = 'REPORTED'
        report.save()

        serializer = ReportSerializer(report, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)