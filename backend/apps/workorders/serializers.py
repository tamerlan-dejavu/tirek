from rest_framework import serializers

from apps.core.fields import DisplayNameField
from apps.defects.models import DefectStatus

from .models import MaintenanceRule, WorkOrder, WorkOrderComment, WorkOrderEvent


class WorkOrderSerializer(serializers.ModelSerializer):
    building_address = serializers.CharField(source="building.address", read_only=True)
    defect_number = serializers.CharField(source="defect.number", read_only=True, default=None)
    risk_category = serializers.CharField(
        source="defect.approved_risk", read_only=True, default=None
    )
    author_name = DisplayNameField(source="created_by")
    responsible_display = DisplayNameField(source="responsible")
    element_name = serializers.CharField(source="element.name", read_only=True, default=None)

    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "number",
            "building",
            "building_address",
            "defect",
            "defect_number",
            "risk_category",
            "basis",
            "element",
            "element_name",
            "title",
            "description",
            "kind",
            "work_type",
            "periodicity",
            "rule",
            "priority",
            "recommended_date",
            "planned_date",
            "responsible",
            "responsible_name",
            "responsible_display",
            "status",
            "status_reason",
            "comment",
            "materials",
            "labor_hours",
            "completed_at",
            "verified_at",
            "verified_by",
            "created_by",
            "author_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "number",
            "status",
            "status_reason",
            "rule",
            "completed_at",
            "verified_at",
            "verified_by",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        building = attrs.get("building") or self.instance.building
        defect = attrs.get("defect")
        if defect:
            if defect.building_id != building.pk:
                raise serializers.ValidationError({"defect": "Дефект другого здания."})
            # AC-12: only from a confirmed defect
            if defect.status != DefectStatus.CONFIRMED and self.instance is None:
                raise serializers.ValidationError({"defect": "Дефект должен быть подтверждён."})
        elif self.instance is None and not attrs.get("basis"):
            raise serializers.ValidationError({"basis": "Укажите дефект или основание."})
        return attrs


class TransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=WorkOrder._meta.get_field("status").choices)
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class WorkOrderEventSerializer(serializers.ModelSerializer):
    actor_name = DisplayNameField(source="actor")

    class Meta:
        model = WorkOrderEvent
        fields = [
            "id",
            "from_status",
            "to_status",
            "actor",
            "actor_name",
            "actor_role",
            "reason",
            "created_at",
        ]
        read_only_fields = fields


class WorkOrderCommentSerializer(serializers.ModelSerializer):
    author_name = DisplayNameField(source="author")

    class Meta:
        model = WorkOrderComment
        fields = ["id", "work_order", "author", "author_name", "text", "created_at"]
        read_only_fields = ["id", "work_order", "author", "created_at"]


class MaintenanceRuleSerializer(serializers.ModelSerializer):
    element_type_name = serializers.CharField(source="element_type.name", read_only=True)
    work_type_display = serializers.CharField(source="get_work_type_display", read_only=True)
    periodicity_display = serializers.CharField(source="get_periodicity_display", read_only=True)

    class Meta:
        model = MaintenanceRule
        fields = [
            "id",
            "element_type",
            "element_type_name",
            "work_type",
            "work_type_display",
            "title",
            "periodicity",
            "periodicity_display",
            "months",
            "materials",
            "labor_hours",
            "note",
            "is_active",
        ]

    def validate_months(self, value):
        if not isinstance(value, list) or any(
            not isinstance(m, int) or not 1 <= m <= 12 for m in value
        ):
            raise serializers.ValidationError("Месяцы — числа от 1 до 12.")
        return sorted(set(value))


class GeneratePlanSerializer(serializers.Serializer):
    building = serializers.UUIDField()
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)
