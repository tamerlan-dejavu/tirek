import django_filters
from django.db.models import Q
from rest_framework import viewsets

from apps.core import access
from apps.organizations.models import OrganizationMembership, Role

from .models import AuditEvent
from .serializers import AuditEventSerializer


class AuditEventFilter(django_filters.FilterSet):
    since = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    until = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = AuditEvent
        fields = ["building", "action", "object_type", "object_id", "actor"]


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """History of significant changes, visible to provider admins only (ТЗ AC-18)."""

    serializer_class = AuditEventSerializer
    filterset_class = AuditEventFilter
    search_fields = ["actor__email", "actor__full_name", "object_id"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        admin_orgs = OrganizationMembership.objects.filter(
            user=user, role=Role.PROVIDER_ADMIN, is_active=True
        ).values("organization_id")
        admin_buildings = access.accessible_building_ids(user, roles={Role.PROVIDER_ADMIN})
        return (
            AuditEvent.objects.select_related("actor", "building")
            .filter(
                Q(organization_id__in=admin_orgs)
                | Q(building_id__in=admin_buildings)
                # Logins and other account events carry no organization: those of own staff
                | Q(actor__memberships__organization_id__in=admin_orgs)
            )
            .distinct()
            .order_by("-created_at")
        )
