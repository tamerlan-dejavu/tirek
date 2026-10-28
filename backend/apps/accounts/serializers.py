from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.organizations.models import OrganizationMembership

from .models import User, UserSession


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    # One-time code, required only when the user has the second factor enabled
    otp = serializers.CharField(required=False, allow_blank=True, default="")


class OtpSerializer(serializers.Serializer):
    code = serializers.CharField()


class MembershipBriefSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    organization_type = serializers.CharField(source="organization.type", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ["id", "organization", "organization_name", "organization_type", "role"]


class MeSerializer(serializers.ModelSerializer):
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "position",
            "preferred_language",
            "mfa_enabled",
            "memberships",
        ]
        read_only_fields = ["id", "email", "mfa_enabled", "memberships"]

    def get_memberships(self, user):
        qs = user.memberships.filter(is_active=True).select_related("organization")
        return MembershipBriefSerializer(qs, many=True).data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "position", "is_active", "date_joined"]
        read_only_fields = ["id", "is_active", "date_joined"]


class SetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_password(self, value):
        validate_password(value)
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ["id", "ip_address", "user_agent", "created_at", "last_seen_at", "is_current"]

    def get_is_current(self, obj):
        return obj.session_key == self.context["request"].session.session_key
