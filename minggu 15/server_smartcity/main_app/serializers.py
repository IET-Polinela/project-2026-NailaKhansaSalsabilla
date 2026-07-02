from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
    reporter_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id',
            'title',
            'category',
            'description',
            'location',
            'status',
            'reporter',
            'reporter_name',
            'is_owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'reporter',
            'reporter_name',
            'is_owner',
            'created_at',
            'updated_at',
        ]

    def get_reporter(self, obj):
        request = self.context.get('request')

        if request and request.user.is_authenticated and obj.reporter_id == request.user.id:
            return obj.reporter.username

        return "Warga Anonim"

    def get_reporter_name(self, obj):
        return self.get_reporter(obj)

    def get_is_owner(self, obj):
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            return False

        return obj.reporter_id == request.user.id


class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id',
            'status',
        ]