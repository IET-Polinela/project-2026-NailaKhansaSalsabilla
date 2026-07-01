from django.views.generic import TemplateView, View
from django.http import JsonResponse
from django.shortcuts import redirect
from django.contrib import messages
from django.db.models import Count

from main_app.models import Report


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


class DashboardView(TemplateView):
    template_name = 'dashboard_24782056/dashboard.html'

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.warning(request, 'Silakan login terlebih dahulu.')
            return redirect('login')

        if not is_admin_user(request.user):
            messages.error(request, 'Dashboard hanya dapat diakses oleh admin.')
            return redirect('report_list')

        return super().dispatch(request, *args, **kwargs)


class DashboardDataView(View):
    def get(self, request):
        if not request.user.is_authenticated or not is_admin_user(request.user):
            return JsonResponse({'detail': 'Akses dashboard hanya untuk admin.'}, status=403)

        queryset = Report.objects.exclude(status='DRAFT')

        status_data = (
            queryset
            .values('status')
            .annotate(total=Count('id'))
            .order_by('status')
        )

        category_data = (
            queryset
            .values('category')
            .annotate(total=Count('id'))
            .order_by('category')
        )

        latest_reported = queryset.filter(status='REPORTED').order_by('-created_at')[:5]
        latest_resolved = queryset.filter(status='RESOLVED').order_by('-created_at')[:5]

        data = {
            'status_labels': [item['status'] for item in status_data],
            'status_counts': [item['total'] for item in status_data],

            'category_labels': [item['category'] for item in category_data],
            'category_counts': [item['total'] for item in category_data],

            'latest_reported': [
                {
                    'title': report.title,
                    'category': report.category,
                    'location': report.location,
                    'created_at': report.created_at.strftime('%d %B %Y %H:%M'),
                }
                for report in latest_reported
            ],

            'latest_resolved': [
                {
                    'title': report.title,
                    'category': report.category,
                    'location': report.location,
                    'created_at': report.created_at.strftime('%d %B %Y %H:%M'),
                }
                for report in latest_resolved
            ],
        }

        return JsonResponse(data)