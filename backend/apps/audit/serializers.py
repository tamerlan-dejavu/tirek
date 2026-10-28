from rest_framework import serializers

from apps.core.fields import DisplayNameField

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)
    actor_name = DisplayNameField(source="actor")
    action_label = serializers.CharField(source="get_action_display", read_only=True)
    building_address = serializers.CharField(
        source="building.address", read_only=True, default=None
    )

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "created_at",
            "actor",
            "actor_email",
            "actor_name",
            "organization",
            "building",
            "building_address",
            "action",
            "action_label",
            "object_type",
            "object_id",
            "changes",
        ]
        read_only_fields = fields
