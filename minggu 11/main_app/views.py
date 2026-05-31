from django.urls import reverse_lazy
from django.views.generic import TemplateView, ListView, DetailView, CreateView, UpdateView, DeleteView
from django.views import View
from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.db.models import Q

from .models import Report
from .forms import ReportForm


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


def can_manage_draft(user, report):
    return bool(
        user and
        user.is_authenticated and
        report.status == 'DRAFT' and
        report.reporter_id == user.id
    )


def accessible_reports_for(user):
    queryset = Report.objects.all().order_by('-created_at')

    if not user.is_authenticated:
        return Report.objects.none()

    if is_admin_user(user):
        return queryset.exclude(status='DRAFT')

    return queryset.filter(
        Q(status__in=NON_DRAFT_STATUSES) |
        Q(reporter=user)
    )


class AdminRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        if not is_admin_user(request.user):
            messages.success(request, 'Akses Ditolak. Hanya admin yang dapat mengakses fitur ini.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class HomeView(TemplateView):
    template_name = 'main_app/home.html'


class ReportListView(ListView):
    model = Report
    template_name = 'main_app/report_list.html'
    context_object_name = 'reports'

    def get_queryset(self):
        return accessible_reports_for(self.request.user)[:50]


class ReportDetailView(DetailView):
    model = Report
    template_name = 'main_app/report_detail.html'
    context_object_name = 'report'

    def get_queryset(self):
        return accessible_reports_for(self.request.user)


class AddReportView(CreateView):
    model = Report
    form_class = ReportForm
    template_name = 'main_app/add_report.html'
    success_url = reverse_lazy('report_list')

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        if not is_admin_user(self.request.user):
            form.instance.reporter = self.request.user
            form.instance.status = 'DRAFT'

        messages.success(self.request, 'Laporan berhasil ditambahkan.')
        return super().form_valid(form)


class UpdateReportView(UpdateView):
    model = Report
    form_class = ReportForm
    template_name = 'main_app/update_report.html'
    success_url = reverse_lazy('report_list')

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        report = self.get_object()

        if not is_admin_user(request.user) and not can_manage_draft(request.user, report):
            messages.error(request, 'Laporan hanya dapat diedit jika masih DRAFT dan milik Anda sendiri.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        messages.success(self.request, 'Laporan berhasil diperbarui.')
        return super().form_valid(form)


class DeleteReportView(DeleteView):
    model = Report
    template_name = 'main_app/delete_report.html'
    context_object_name = 'report'
    success_url = reverse_lazy('report_list')

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        report = self.get_object()

        if not is_admin_user(request.user) and not can_manage_draft(request.user, report):
            messages.error(request, 'Laporan hanya dapat dihapus jika masih DRAFT dan milik Anda sendiri.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        messages.success(self.request, 'Laporan berhasil dihapus.')
        return super().form_valid(form)


class ReportUpdateStatusView(View):
    def post(self, request, pk):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        report = get_object_or_404(Report, pk=pk)
        new_status = request.POST.get('status')

        if can_manage_draft(request.user, report) and report.status == 'DRAFT' and new_status == 'REPORTED':
            report.status = 'REPORTED'
            report.save()
            messages.success(request, 'Laporan berhasil dikirim dan status berubah menjadi Reported.')
            return redirect('report_list')

        if is_admin_user(request.user):
            next_status_map = {
                'REPORTED': 'VERIFIED',
                'VERIFIED': 'IN_PROGRESS',
                'IN_PROGRESS': 'RESOLVED',
            }

            current_status = report.status

            if current_status in next_status_map and new_status == next_status_map[current_status]:
                report.status = new_status
                report.save()
                messages.success(
                    request,
                    f'Status laporan berhasil diubah menjadi {report.get_status_display()}.'
                )
            else:
                messages.error(request, 'Perubahan status tidak valid.')

            return redirect('report_list')

        messages.error(request, 'Anda tidak memiliki izin untuk mengubah status laporan ini.')
        return redirect('report_list')


class ReportSearchView(View):
    def get(self, request):
        keyword = request.GET.get('q', '').strip()
        reports = accessible_reports_for(request.user)

        if keyword:
            reports = reports.filter(
                Q(title__icontains=keyword) |
                Q(category__icontains=keyword) |
                Q(location__icontains=keyword) |
                Q(status__icontains=keyword)
            )

        reports = reports[:50]
        data = []

        for report in reports:
            data.append({
                'id': report.id,
                'title': report.title,
                'category': report.category,
                'location': report.location,
                'status': report.status,
                'status_display': report.get_status_display(),
                'can_manage_draft': can_manage_draft(request.user, report),
                'is_admin': is_admin_user(request.user),
            })

        return JsonResponse({'reports': data})


class ReportDetailJsonView(View):
    def get(self, request, pk):
        report = get_object_or_404(accessible_reports_for(request.user), pk=pk)

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