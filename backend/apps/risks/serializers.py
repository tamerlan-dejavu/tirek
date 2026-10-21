from rest_framework import serializers

from .models import RiskAssessment


class RiskAssessmentSerializer(serializers.ModelSerializer):
    engineer_name = serializers.CharField(source="engineer.__str__", read_only=True)

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
