from rest_framework import serializers

from .models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source="actor.email", read_only=True, default=None)

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "created_at",
            "actor",
            "actor_email",
            "organization",
            "building",
            "action",
            "object_type",
            "object_id",
            "changes",
        ]
        read_only_fields = fields
