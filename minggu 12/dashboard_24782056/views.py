from django.views.generic import TemplateView, View
from django.http import JsonResponse
from django.db.models import Count
from main_app.models import Report


class DashboardView(TemplateView):
    template_name = 'dashboard_24782056/dashboard.html'


class DashboardDataView(View):
    def get(self, request):
        status_data = (
            Report.objects
            .values('status')
            .annotate(total=Count('id'))
            .order_by('status')
        )

        category_data = (
            Report.objects
            .values('category')
            .annotate(total=Count('id'))
            .order_by('category')
        )

        latest_reported = Report.objects.filter(status='REPORTED').order_by('-created_at')[:5]
        latest_resolved = Report.objects.filter(status='RESOLVED').order_by('-created_at')[:5]

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