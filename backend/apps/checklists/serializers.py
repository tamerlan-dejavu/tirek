from rest_framework import serializers

from .models import ChecklistItem, ChecklistTemplate, ChecklistTemplateVersion


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = [
            "id",
            "version",
            "element_type",
            "code",
            "text",
            "guidance",
            "answer_type",
            "unit",
            "choices",
            "is_required",
            "photo_required_on_fail",
            "sort_order",
        ]
        read_only_fields = ["id"]

    def validate_version(self, version):
        if not version.is_editable:
            raise serializers.ValidationError("Опубликованная версия не редактируется.")
        return version


class ChecklistTemplateVersionSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)

    class Meta:
        model = ChecklistTemplateVersion
        fields = [
            "id",
            "template",
            "number",
            "status",
            "published_at",
            "approved_by_note",
            "items",
        ]
        read_only_fields = ["id", "number", "status", "published_at", "items"]


class ChecklistTemplateSerializer(serializers.ModelSerializer):
    latest_published_version = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTemplate
        fields = [
            "id",
            "organization",
            "inspection_type",
            "building_type",
            "name",
            "description",
            "is_active",
            "latest_published_version",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_latest_published_version(self, obj):
        v = obj.versions.filter(status=ChecklistTemplateVersion.Status.PUBLISHED).first()
        return v.pk if v else None
