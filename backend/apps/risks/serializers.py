from rest_framework import serializers

from apps.core.fields import DisplayNameField

from .models import RiskAssessment


class RiskAssessmentSerializer(serializers.ModelSerializer):
    engineer_name = DisplayNameField(source="engineer")

    class Meta:
        model = RiskAssessment
        fields = [
            "id",
            "defect",
            "category",
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
        read_only_fields = ["id", "engineer", "version", "supersedes", "created_at"]
