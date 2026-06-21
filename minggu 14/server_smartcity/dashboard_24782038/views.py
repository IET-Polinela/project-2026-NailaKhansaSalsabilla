from django.views.generic import TemplateView
from django.http import JsonResponse
from django.db.models import Count
from main_app.models import Report


class DashboardView(TemplateView):
    template_name = 'dashboard/dashboard.html'


def dashboard_data(request):
    status_data = Report.objects.values('status').annotate(total=Count('id'))
    category_data = Report.objects.values('category').annotate(total=Count('id'))

    total_reports = Report.objects.count()
    reported_count = Report.objects.filter(status='REPORTED').count()
    verified_count = Report.objects.filter(status='VERIFIED').count()
    in_progress_count = Report.objects.filter(status='IN_PROGRESS').count()
    resolved_count = Report.objects.filter(status='RESOLVED').count()

    latest_reported = list(
        Report.objects.filter(status='REPORTED')
        .order_by('-created_at')[:5]
        .values('id', 'title', 'category', 'location', 'status', 'created_at')
    )

    latest_resolved = list(
        Report.objects.filter(status='RESOLVED')
        .order_by('-created_at')[:5]
        .values('id', 'title', 'category', 'location', 'status', 'created_at')
    )

    return JsonResponse({
        'status_data': list(status_data),
        'category_data': list(category_data),
        'total_reports': total_reports,
        'reported_count': reported_count,
        'verified_count': verified_count,
        'in_progress_count': in_progress_count,
        'resolved_count': resolved_count,
        'latest_reported': latest_reported,
        'latest_resolved': latest_resolved,
    })