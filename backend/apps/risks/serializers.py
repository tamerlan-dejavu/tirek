from rest_framework import serializers

from apps.core.fields import DisplayNameField

from .models import RiskAssessment


class RiskAssessmentSerializer(serializers.ModelSerializer):
    is_override = serializers.SerializerMethodField()
    engineer_name = DisplayNameField(source="engineer")

    class Meta:
        model = RiskAssessment
        fields = [
            "id",
            "defect",
            "category",
            "probability",
            "consequences",
            "condition",
            "service_life",
            "score",
            "suggested_category",
            "is_override",
            "hazard_description",
            "justification",
            "recommended_actions",
            "engineer",
            "engineer_name",
            "version",
            "supersedes",
            "revision_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "engineer",
            "version",
            "supersedes",
            "score",
            "suggested_category",
            "created_at",
        ]

    def get_is_override(self, obj) -> bool:
        return bool(obj.suggested_category) and obj.suggested_category != obj.category
