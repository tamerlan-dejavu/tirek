from rest_framework import serializers

from apps.accounts.models import User

from .models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    Organization,
    OrganizationMembership,
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "type",
            "name",
            "legal_name",
            "bin",
            "address",
            "contact_email",
            "contact_phone",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "is_active", "created_at"]


class MembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "organization",
            "role",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "user", "organization", "created_at"]


class InviteMemberSerializer(serializers.Serializer):
    """Admin invites a person by email; the account is created without a password."""

    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    position = serializers.CharField(max_length=255, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=OrganizationMembership._meta.get_field("role").choices)


class BuildingLinkSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = BuildingOrganizationLink
        fields = [
            "id",
            "building",
            "organization",
            "organization_name",
            "function",
            "valid_from",
            "valid_to",
            "note",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "valid_to", "created_at"]


class BuildingAssignmentSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True))

    class Meta:
        model = BuildingAssignment
        fields = ["id", "building", "user", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
