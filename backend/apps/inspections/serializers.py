from rest_framework import serializers

from apps.checklists.models import AnswerType, ChecklistTemplateVersion

from .models import Inspection, InspectionAnswer, InspectionReview


class InspectionSerializer(serializers.ModelSerializer):
    building_address = serializers.CharField(source="building.address", read_only=True)
    assignee_name = serializers.CharField(source="assignee.__str__", read_only=True)
    is_published = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = [
            "id",
            "number",
            "building",
            "building_address",
            "provider_organization",
            "template_version",
            "inspection_type",
            "assignee",
            "assignee_name",
            "reviewer",
            "status",
            "planned_date",
            "performed_at",
            "scope_and_limitations",
            "weather_conditions",
            "summary",
            "cancel_reason",
            "submitted_at",
            "approved_at",
            "approved_by",
            "published_at",
            "is_published",
            "version",
            "supersedes",
            "correction_reason",
            "created_at",
            "updated_at",
        ]
        # Status and lifecycle fields change only through explicit actions
        read_only_fields = [
            "id",
            "number",
            "status",
            "cancel_reason",
            "submitted_at",
            "approved_at",
            "approved_by",
            "published_at",
            "version",
            "supersedes",
            "correction_reason",
            "created_at",
            "updated_at",
        ]

    def get_is_published(self, obj):
        return obj.published_at is not None

    def validate_template_version(self, version):
        if version.status != ChecklistTemplateVersion.Status.PUBLISHED:
            raise serializers.ValidationError("Нужна опубликованная версия чек-листа.")
        return version

    def validate(self, attrs):
        if self.instance and not self.instance.is_editable:
            raise serializers.ValidationError("Обследование нельзя изменить в текущем статусе.")
        if self.instance and "template_version" in attrs:
            if attrs["template_version"] != self.instance.template_version:
                raise serializers.ValidationError(
                    {"template_version": "Версию чек-листа нельзя сменить после создания."}
                )
        return attrs


class InspectionAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionAnswer
        fields = [
            "id",
            "inspection",
            "item",
            "element",
            "compliance",
            "number_value",
            "text_value",
            "date_value",
            "choice_value",
            "comment",
            "answered_by",
            "updated_at",
        ]
        read_only_fields = ["id", "answered_by", "updated_at"]

    def validate(self, attrs):
        inspection = attrs.get("inspection") or self.instance.inspection
        item = attrs.get("item") or self.instance.item
        if not inspection.is_editable:
            raise serializers.ValidationError("Обследование не в статусе черновика.")
        if item.version_id != inspection.template_version_id:
            raise serializers.ValidationError({"item": "Пункт из другой версии чек-листа."})
        element = attrs.get("element")
        if element and element.building_id != inspection.building_id:
            raise serializers.ValidationError({"element": "Элемент другого здания."})
        if item.answer_type == AnswerType.CHOICE and attrs.get("choice_value"):
            if attrs["choice_value"] not in item.choices:
                raise serializers.ValidationError(
                    {"choice_value": "Значение не из классификатора."}
                )
        return attrs


class InspectionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionReview
        fields = [
            "id",
            "inspection",
            "reviewer",
            "decision",
            "comment",
            "item_comments",
            "created_at",
        ]
        read_only_fields = fields


class ReturnSerializer(serializers.Serializer):
    comment = serializers.CharField()
    item_comments = serializers.ListField(child=serializers.DictField(), required=False)


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField()
