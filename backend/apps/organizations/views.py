from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.services import send_invite
from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet

from .models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    Organization,
    OrganizationMembership,
    OrganizationType,
    Role,
)
from .serializers import (
    BuildingAssignmentSerializer,
    BuildingLinkSerializer,
    InviteMemberSerializer,
    MembershipSerializer,
    OrganizationSerializer,
)


def _is_org_admin(user, organization) -> bool:
    if user.is_superuser:
        return True
    admin_role = Role.PROVIDER_ADMIN if organization.type == OrganizationType.PROVIDER else None
    if admin_role is None:
        # Customer organizations are administered by a linked provider admin
        return OrganizationMembership.objects.filter(
            user=user,
            role=Role.PROVIDER_ADMIN,
            is_active=True,
            organization__building_links__building__organization_links__organization=organization,
        ).exists()
    return OrganizationMembership.objects.filter(
        user=user, organization=organization, role=admin_role, is_active=True
    ).exists()


def _is_any_provider_admin(user) -> bool:
    return (
        user.is_superuser
        or OrganizationMembership.objects.filter(
            user=user, role=Role.PROVIDER_ADMIN, is_active=True
        ).exists()
    )


class OrganizationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = OrganizationSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ["type", "is_active"]
    search_fields = ["name", "legal_name", "bin"]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        own = OrganizationMembership.objects.filter(user=user, is_active=True).values(
            "organization_id"
        )
        partners = BuildingOrganizationLink.objects.filter(
            building_id__in=access.accessible_building_ids(user)
        ).values("organization_id")
        return Organization.objects.filter(Q(id__in=own) | Q(id__in=partners)).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        org_type = serializer.validated_data["type"]
        # Platform staff create providers; provider admins may register their customers
        if not (
            user.is_superuser
            or (org_type == OrganizationType.CUSTOMER and _is_any_provider_admin(user))
        ):
            raise PermissionDenied("Недостаточно прав для создания организации.")
        org = serializer.save(created_by=user)
        log(
            AuditAction.ADMIN_ACTION,
            org,
            request=self.request,
            organization=org,
            changes={"created": serializer.data},
        )

    def perform_update(self, serializer):
        if not _is_org_admin(self.request.user, serializer.instance):
            raise PermissionDenied()
        org = serializer.save()
        log(
            AuditAction.ADMIN_ACTION,
            org,
            request=self.request,
            organization=org,
            changes={"updated": self.request.data},
        )

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        org = self.get_object()
        if not _is_org_admin(request.user, org):
            raise PermissionDenied()
        qs = org.memberships.select_related("user")
        return Response(MembershipSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        org = self.get_object()
        if not _is_org_admin(request.user, org):
            raise PermissionDenied()
        data = InviteMemberSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        email = data.validated_data["email"].lower()
        user = User.objects.filter(email=email).first()
        created = user is None
        if created:
            user = User.objects.create_user(
                email=email,
                full_name=data.validated_data.get("full_name", ""),
                position=data.validated_data.get("position", ""),
            )
        membership, _ = OrganizationMembership.objects.update_or_create(
            user=user,
            organization=org,
            role=data.validated_data["role"],
            defaults={"is_active": True, "created_by": request.user},
        )
        log(
            AuditAction.ROLE_CHANGED,
            membership,
            request=request,
            organization=org,
            changes={"user": email, "role": membership.role, "granted": True},
        )
        if created:
            send_invite(user, request=request)
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class MembershipViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Change role or deactivate a membership. Every change is audited (ТЗ 4.3)."""

    serializer_class = MembershipSerializer
    http_method_names = ["patch"]

    def get_queryset(self):
        return OrganizationMembership.objects.select_related("organization", "user")

    def perform_update(self, serializer):
        membership = serializer.instance
        if not _is_org_admin(self.request.user, membership.organization):
            raise PermissionDenied()
        before = {"role": membership.role, "is_active": membership.is_active}
        membership = serializer.save()
        log(
            AuditAction.ROLE_CHANGED,
            membership,
            request=self.request,
            organization=membership.organization,
            changes={
                "before": before,
                "after": {"role": membership.role, "is_active": membership.is_active},
            },
        )


class BuildingLinkViewSet(BuildingScopedViewSet):
    """Grant / revoke an organization's access to a building (ТЗ 5.2)."""

    queryset = BuildingOrganizationLink.objects.select_related("organization")
    serializer_class = BuildingLinkSerializer
    filterset_fields = ["building", "organization", "function"]
    create_roles = (Role.PROVIDER_ADMIN,)
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        link = serializer.instance
        log(
            AuditAction.BUILDING_ACCESS_CHANGED,
            link,
            request=self.request,
            building=link.building,
            organization=link.organization,
            changes={"granted": link.function},
        )

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        link = self.get_object()
        access.require(request.user, link.building_id, Role.PROVIDER_ADMIN)
        link.valid_to = timezone.now()
        link.save(update_fields=["valid_to", "updated_at"])
        log(
            AuditAction.BUILDING_ACCESS_CHANGED,
            link,
            request=request,
            building=link.building,
            organization=link.organization,
            changes={"revoked": link.function},
        )
        return Response(BuildingLinkSerializer(link).data)


class BuildingAssignmentViewSet(BuildingScopedViewSet):
    queryset = BuildingAssignment.objects.select_related("user")
    serializer_class = BuildingAssignmentSerializer
    filterset_fields = ["building", "user", "is_active"]
    create_roles = (Role.PROVIDER_ADMIN,)
    update_roles = (Role.PROVIDER_ADMIN,)
