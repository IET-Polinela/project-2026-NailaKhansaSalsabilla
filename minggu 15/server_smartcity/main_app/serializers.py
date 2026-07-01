from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.SerializerMethodField()
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
            'is_owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'reporter',
            'is_owner',
            'created_at',
            'updated_at',
        ]

    def get_reporter(self, obj):
        request = self.context.get('request')

        if request and request.query_params.get('tab') == 'feed':
            return "Warga Anonim"

        if request and request.user.is_authenticated and obj.reporter == request.user:
            return obj.reporter.username

        return "Warga Anonim"

    def get_is_owner(self, obj):
        request = self.context.get('request')

        if not request or not request.user.is_authenticated:
            return False

        return obj.reporter == request.user


class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id',
            'status',
        ]
