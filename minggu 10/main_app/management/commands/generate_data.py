import random
from django.core.management.base import BaseCommand
from faker import Faker
from main_app.models import Report

fake = Faker('id_ID')


class Command(BaseCommand):
    help = 'Generate contextual fake reports for Smart City Issue Reporting'

    def add_arguments(self, parser):
        parser.add_argument('num_records', type=int, help='Jumlah data')

    def handle(self, *args, **kwargs):
        num_records = kwargs['num_records']

        context_data = {
            'Jalan Rusak': {
                'titles': [
                    'Lubang Besar di Tengah Jalan',
                    'Aspal Mengelupas Parah',
                    'Jalan Bergelombang Bahayakan Motor',
                    'Ambles di Dekat Drainase',
                ],
                'desc': 'Ditemukan kerusakan jalan yang cukup dalam. Mohon segera diperbaiki sebelum membahayakan warga.'
            },
            'Sampah': {
                'titles': [
                    'Tumpukan Sampah Liar',
                    'Bau Menyengat Sampah Menumpuk',
                    'TPS Melebihi Kapasitas',
                    'Sampah Menutup Saluran Air',
                ],
                'desc': 'Warga mengeluhkan penumpukan sampah yang belum diangkut selama beberapa hari.'
            },
            'Lampu Mati': {
                'titles': [
                    'Penerangan Jalan Umum Mati',
                    'Lampu Jalan Berkedip',
                    'Kabel Lampu Putus',
                    'Area Gelap Rawan Kriminalitas',
                ],
                'desc': 'Lampu jalan di area ini mati sehingga kondisi jalan menjadi gelap dan berbahaya.'
            },
            'Drainase': {
                'titles': [
                    'Saluran Air Mampet',
                    'Drainase Meluap Saat Hujan',
                    'Tutup Got Pecah',
                    'Penyumbatan Karena Sedimen',
                ],
                'desc': 'Saluran air tersumbat sehingga air meluap ke badan jalan saat hujan turun.'
            },
            'Keamanan': {
                'titles': [
                    'Aksi Vandalisme Fasilitas Umum',
                    'Pencurian Kabel Telepon',
                    'Laporan Kerumunan Mencurigakan',
                    'Gangguan Ketertiban Umum',
                ],
                'desc': 'Dibutuhkan patroli tambahan karena terdapat laporan aktivitas mencurigakan di area tersebut.'
            },
        }

        status_choices = ['REPORTED', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED']

        for _ in range(num_records):
            category = random.choice(list(context_data.keys()))
            title_template = random.choice(context_data[category]['titles'])
            description_base = context_data[category]['desc']

            Report.objects.create(
                title=f"{title_template} - {fake.street_name()}",
                category=category,
                description=f"{description_base} Lokasi detail: {fake.street_address()}.",
                location=f"Kecamatan {fake.city()}, {fake.address()}",
                status=random.choice(status_choices),
            )

        self.stdout.write(
            self.style.SUCCESS(f'Berhasil membuat {num_records} laporan kontekstual!')
        )