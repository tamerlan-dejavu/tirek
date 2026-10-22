from rest_framework import serializers

from apps.core.fields import DisplayNameField

from .models import Defect, DefectEvent, DefectObservation


class DefectSerializer(serializers.ModelSerializer):
    building_address = serializers.CharField(source="building.address", read_only=True)
    element_path = serializers.ListField(source="element.path", read_only=True)
    approved_risk = serializers.CharField(read_only=True, allow_null=True)
    # Used by the schematic building view and analytics to place / group the defect
    element_type = serializers.CharField(source="element.element_type_id", read_only=True)
    element_group = serializers.CharField(source="element.element_type.group", read_only=True)
    inspection_number = serializers.CharField(
        source="inspection.number", read_only=True, default=None
    )
    author_name = DisplayNameField(source="created_by")

    class Meta:
        model = Defect
        fields = [
            "id",
            "number",
            "building",
            "building_address",
            "element",
            "element_path",
            "element_type",
            "element_group",
            "inspection_number",
            "author_name",
            "location",
            "inspection",
            "answer",
            "defect_type",
            "description",
            "detected_on",
            "preliminary_severity",
            "approved_risk",
            "current_risk",
            "recommendations",
            "status",
            "rejection_reason",
            "closure_basis",
            "closed_at",
            "closed_by",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "number",
            "current_risk",
            "status",
            "rejection_reason",
            "closure_basis",
            "closed_at",
            "closed_by",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        building = attrs.get("building") or self.instance.building
        element = attrs.get("element")
        if element and element.building_id != building.pk:
            raise serializers.ValidationError({"element": "Элемент другого здания."})
        inspection = attrs.get("inspection")
        if inspection:
            if inspection.building_id != building.pk:
                raise serializers.ValidationError({"inspection": "Обследование другого здания."})
            if not inspection.is_editable:
                raise serializers.ValidationError({"inspection": "Обследование уже отправлено."})
        answer = attrs.get("answer")
        if answer and inspection and answer.inspection_id != inspection.pk:
            raise serializers.ValidationError({"answer": "Ответ из другого обследования."})
        return attrs


class DefectObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefectObservation
        fields = [
            "id",
            "defect",
            "inspection",
            "observed_on",
            "description",
            "trend",
            "observer",
            "created_at",
        ]
        read_only_fields = ["id", "defect", "observer", "created_at"]


class DefectEventSerializer(serializers.ModelSerializer):
    actor_name = DisplayNameField(source="actor")

    class Meta:
        model = DefectEvent
        fields = ["id", "from_status", "to_status", "actor", "actor_name", "comment", "created_at"]
        read_only_fields = fields


class CommentSerializer(serializers.Serializer):
    comment = serializers.CharField()


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField()


class BasisSerializer(serializers.Serializer):
    basis = serializers.CharField()
