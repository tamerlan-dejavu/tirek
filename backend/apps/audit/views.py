from django.db.models import Q
from rest_framework import viewsets

from apps.core import access
from apps.organizations.models import OrganizationMembership, Role

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """History of significant changes, visible to provider admins only (ТЗ AC-18)."""

    serializer_class = AuditEventSerializer
    filterset_fields = ["building", "action", "object_type", "object_id", "actor"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        admin_orgs = OrganizationMembership.objects.filter(
            user=user, role=Role.PROVIDER_ADMIN, is_active=True
        ).values("organization_id")
        admin_buildings = access.accessible_building_ids(user, roles={Role.PROVIDER_ADMIN})
        return AuditEvent.objects.select_related("actor").filter(
            Q(organization_id__in=admin_orgs) | Q(building_id__in=admin_buildings)
        )
