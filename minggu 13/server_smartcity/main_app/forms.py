from django import forms
from .models import Report

class ReportForm(forms.ModelForm):
    class Meta:
        model = Report
        fields = ['title', 'category', 'description', 'location']
        widgets = {
            'title': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Masukkan judul laporan'
            }),
            'category': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Masukkan kategori laporan'
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Masukkan deskripsi laporan',
                'rows': 5
            }),
            'location': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Masukkan lokasi kejadian'
            }),
        }

        labels = {
            'title': 'Judul Laporan',
            'category': 'Kategori',
            'description': 'Deskripsi',
            'location': 'Lokasi',
        }
