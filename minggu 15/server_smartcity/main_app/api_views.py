from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Report
from .serializers import ReportSerializer
from .permissions import IsCitizen, is_admin_user


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
        tab = self.request.query_params.get('tab')
        queryset = Report.objects.all().order_by('-updated_at')

        if not user.is_authenticated:
            if tab == 'my_reports':
                return Report.objects.none()

            return queryset.filter(status__in=NON_DRAFT_STATUSES)

        if is_admin_user(user):
            if tab == 'my_reports':
                return Report.objects.none()

            return queryset.filter(status__in=NON_DRAFT_STATUSES)

        if tab == 'my_reports':
            return queryset.filter(reporter=user)

        if tab == 'feed':
            return queryset.filter(status__in=NON_DRAFT_STATUSES)

        return queryset.filter(
            Q(status__in=NON_DRAFT_STATUSES) |
            Q(reporter=user, status='DRAFT')
        )

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsCitizen()]

        if self.action in ['update', 'partial_update', 'submit']:
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user, status='DRAFT')

    def update(self, request, *args, **kwargs):
        report = self.get_object()

        if is_admin_user(request.user):
            return Response(
                {'detail': 'Admin tidak dapat mengedit laporan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if report.reporter_id != request.user.id or report.status != 'DRAFT':
            return Response(
                {'detail': 'Citizen hanya dapat mengedit draft miliknya sendiri.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        data['status'] = 'DRAFT'

        serializer = self.get_serializer(report, data=data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save(status='DRAFT')

        return Response(serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        report = self.get_object()

        if is_admin_user(request.user):
            return Response(
                {'detail': 'Admin tidak dapat mengedit laporan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if report.reporter_id != request.user.id or report.status != 'DRAFT':
            return Response(
                {'detail': 'Citizen hanya dapat mengedit draft miliknya sendiri.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        data['status'] = 'DRAFT'

        serializer = self.get_serializer(report, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status='DRAFT')

        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(exclude=True)
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        report = self.get_object()

        if is_admin_user(request.user):
            return Response(
                {'detail': 'Admin tidak dapat mengirim draft citizen.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if report.reporter_id != request.user.id:
            return Response(
                {'detail': 'Anda hanya dapat mengirim draft milik sendiri.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if report.status != 'DRAFT':
            return Response(
                {'detail': 'Hanya laporan berstatus DRAFT yang dapat dikirim.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        report.status = 'REPORTED'
        report.save()

        serializer = ReportSerializer(report, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)