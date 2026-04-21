from django.urls import path
from .views import (
    HomeView,
    ReportListView,
    ReportDetailView,
    AddReportView,
    UpdateReportView,
    DeleteReportView,
    ReportUpdateStatusView,
)

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('reports/', ReportListView.as_view(), name='report_list'),
    path('detail/<int:pk>/', ReportDetailView.as_view(), name='report_detail'),
    path('add/', AddReportView.as_view(), name='add_report'),
    path('update/<int:pk>/', UpdateReportView.as_view(), name='update_report'),
    path('delete/<int:pk>/', DeleteReportView.as_view(), name='delete_report'),
    path('update-status/<int:pk>/', ReportUpdateStatusView.as_view(), name='update_status'),
]