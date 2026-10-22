from rest_framework import serializers

from apps.buildings.models import Building

from .models import FileKind, StoredFile

# Objects files may be attached to → (app_label, model)
LINK_TARGETS = {
    "building": ("buildings", "building"),
    "building_element": ("buildings", "buildingelement"),
    "inspection": ("inspections", "inspection"),
    "inspection_answer": ("inspections", "inspectionanswer"),
    "defect": ("defects", "defect"),
    "defect_observation": ("defects", "defectobservation"),
    "work_order": ("workorders", "workorder"),
    "service_request": ("service_requests", "servicerequest"),
}


class StoredFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoredFile
        fields = [
            "id",
            "kind",
            "original_name",
            "content_type",
            "size",
            "sha256",
            "width",
            "height",
            "taken_at",
            "caption",
            "building",
            "uploaded_by",
            "created_at",
        ]
        read_only_fields = fields


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    building = serializers.PrimaryKeyRelatedField(queryset=Building.objects.all())
    kind = serializers.ChoiceField(choices=FileKind.choices, default=FileKind.PHOTO)
    caption = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    target_type = serializers.ChoiceField(choices=list(LINK_TARGETS), required=False)
    target_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if bool(attrs.get("target_type")) != bool(attrs.get("target_id")):
            raise serializers.ValidationError("target_type и target_id указываются вместе.")
        return attrs


class LinkSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=list(LINK_TARGETS))
    target_id = serializers.UUIDField()
