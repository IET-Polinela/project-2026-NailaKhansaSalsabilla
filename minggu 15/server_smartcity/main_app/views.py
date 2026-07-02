from django.views.generic import TemplateView, ListView, DetailView
from django.views import View
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q
from drf_spectacular.utils import extend_schema

from .models import Report


NON_DRAFT_STATUSES = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']


def is_admin_user(user):
    return bool(
        user and
        user.is_authenticated and
        (
            getattr(user, 'is_admin', False) or
            user.is_staff or
            user.is_superuser
        )
    )


def backend_public_reports():
    return Report.objects.filter(
        status__in=NON_DRAFT_STATUSES
    ).order_by('-created_at')


class HomeView(TemplateView):
    template_name = 'main_app/home.html'


class ReportListView(ListView):
    model = Report
    template_name = 'main_app/report_list.html'
    context_object_name = 'reports'

    def get_queryset(self):
        return backend_public_reports()[:50]


class ReportDetailView(DetailView):
    model = Report
    template_name = 'main_app/report_detail.html'
    context_object_name = 'report'

    def get_queryset(self):
        return backend_public_reports()


class AddReportView(View):
    def get(self, request, *args, **kwargs):
        messages.error(
            request,
            'Tambah laporan tidak tersedia di backend. Laporan hanya dibuat melalui frontend Citizen Portal.'
        )
        return redirect('report_list')

    def post(self, request, *args, **kwargs):
        messages.error(
            request,
            'Tambah laporan tidak tersedia di backend. Laporan hanya dibuat melalui frontend Citizen Portal.'
        )
        return redirect('report_list')


class UpdateReportView(View):
    def get(self, request, *args, **kwargs):
        messages.error(request, 'Edit laporan tidak tersedia di backend.')
        return redirect('report_list')

    def post(self, request, *args, **kwargs):
        messages.error(request, 'Edit laporan tidak tersedia di backend.')
        return redirect('report_list')


class DeleteReportView(View):
    def get(self, request, *args, **kwargs):
        messages.error(request, 'Hapus laporan tidak diizinkan.')
        return redirect('report_list')

    def post(self, request, *args, **kwargs):
        messages.error(request, 'Hapus laporan tidak diizinkan.')
        return redirect('report_list')


class ReportUpdateStatusView(View):
    def post(self, request, pk):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login sebagai admin untuk mengubah status laporan.')
            return redirect('login')

        if not is_admin_user(request.user):
            messages.error(request, 'Hanya admin yang dapat mengubah status laporan.')
            return redirect('report_list')

        report = get_object_or_404(backend_public_reports(), pk=pk)
        new_status = request.POST.get('status')

        next_status_map = {
            'REPORTED': 'VERIFIED',
            'VERIFIED': 'IN_PROGRESS',
            'IN_PROGRESS': 'RESOLVED',
        }

        current_status = report.status
        expected_status = next_status_map.get(current_status)

        if expected_status and new_status == expected_status:
            report.status = new_status
            report.save()

            messages.success(
                request,
                f'Status laporan berhasil diubah menjadi {report.get_status_display()}.'
            )
        else:
            messages.error(request, 'Perubahan status tidak valid.')

        return redirect('report_list')


class ReportSearchView(View):
    def get(self, request):
        keyword = request.GET.get('q', '').strip()
        reports = backend_public_reports()

        if keyword:
            reports = reports.filter(
                Q(title__icontains=keyword) |
                Q(category__icontains=keyword) |
                Q(location__icontains=keyword) |
                Q(status__icontains=keyword)
            )

        data = []

        for report in reports[:50]:
            data.append({
                'id': report.id,
                'title': report.title,
                'category': report.category,
                'location': report.location,
                'status': report.status,
                'status_display': report.get_status_display(),
                'is_admin': is_admin_user(request.user),
            })

        return JsonResponse({'reports': data})


class ReportDetailJsonView(View):
    @extend_schema(exclude=True)
    def get(self, request, pk):
        report = get_object_or_404(backend_public_reports(), pk=pk)

        data = {
            'id': report.id,
            'title': report.title,
            'category': report.category,
            'description': report.description,
            'location': report.location,
            'status': report.status,
            'status_display': report.get_status_display(),
            'created_at': report.created_at.strftime('%d %B %Y %H:%M'),
        }

        return JsonResponse(data)