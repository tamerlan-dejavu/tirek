from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet
from apps.organizations.models import BuildingOrganizationLink, LinkFunction, Role

from .models import Building, BuildingDocument, BuildingElement, ElementType
from .serializers import (
    BuildingDocumentSerializer,
    BuildingElementSerializer,
    BuildingHistorySerializer,
    BuildingSerializer,
    ElementTypeSerializer,
)

EDITORS = (Role.PROVIDER_ADMIN, Role.REVIEWING_ENGINEER)


class BuildingViewSet(BuildingScopedViewSet):
    queryset = Building.objects.select_related("management_organization")
    serializer_class = BuildingSerializer
    building_field = "id"
    update_roles = EDITORS
    search_fields = ["internal_code", "address", "name"]
    filterset_fields = ["city", "structural_scheme"]
    ordering_fields = ["address", "created_at", "year_built"]

    def get_queryset(self):
        return Building.objects.filter(id__in=access.accessible_building_ids(self.request.user))

    def building_id_for_instance(self, instance):
        return instance.pk

    def perform_create(self, serializer):
        provider = serializer.validated_data.pop("provider_organization")
        building = serializer.save(created_by=self.request.user)
        BuildingOrganizationLink.objects.create(
            building=building,
            organization=provider,
            function=LinkFunction.TECHNICAL_SUPPORT,
            created_by=self.request.user,
        )
        log(
            AuditAction.BUILDING_CHANGED,
            building,
            request=self.request,
            building=building,
            organization=provider,
            changes={"created": True},
        )

    def perform_update(self, serializer):
        before = {f: str(getattr(serializer.instance, f)) for f in Building.PASSPORT_FIELDS}
        super().perform_update(serializer)
        building = serializer.instance
        changed = {
            f: {"from": before[f], "to": str(getattr(building, f))}
            for f in Building.PASSPORT_FIELDS
            if before[f] != str(getattr(building, f))
        }
        if changed:
            # Remember where the new value came from (ТЗ 5.3)
            source = self.request.data.get("source", "")
            for field in changed:
                building.field_sources[field] = {
                    "source": source,
                    "recorded_at": timezone.now().isoformat(),
                    "by": str(self.request.user.pk),
                }
            building.save(update_fields=["field_sources"])
            log(AuditAction.BUILDING_CHANGED, building, request=self.request, changes=changed)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        building = self.get_object()
        records = list(building.history.select_related("history_user").order_by("-history_date"))
        rows = []
        for newer, older in zip(records, records[1:] + [None], strict=False):
            changes = {}
            if older is not None:
                diff = newer.diff_against(older)
                changes = {c.field: {"from": c.old, "to": c.new} for c in diff.changes}
            rows.append(
                {
                    "history_id": newer.history_id,
                    "history_date": newer.history_date,
                    "history_type": newer.history_type,
                    "history_user": str(newer.history_user) if newer.history_user else None,
                    "changes": {
                        k: {kk: str(vv) for kk, vv in v.items()} for k, v in changes.items()
                    },
                }
            )
        return Response(BuildingHistorySerializer(rows, many=True).data)


class ElementTypeViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = ElementType.objects.filter(is_active=True)
    serializer_class = ElementTypeSerializer
    pagination_class = None
    filterset_fields = ["group"]


class BuildingElementViewSet(BuildingScopedViewSet):
    queryset = BuildingElement.objects.select_related("element_type", "parent")
    serializer_class = BuildingElementSerializer
    filterset_fields = ["building", "parent", "element_type", "is_active"]
    search_fields = ["name", "location"]
    create_roles = EDITORS
    update_roles = EDITORS
    pagination_class = None


class BuildingDocumentViewSet(BuildingScopedViewSet):
    queryset = BuildingDocument.objects.select_related("file")
    serializer_class = BuildingDocumentSerializer
    filterset_fields = ["building", "kind", "is_published"]
    create_roles = EDITORS + (Role.FIELD_SPECIALIST,)
    update_roles = EDITORS

    def get_queryset(self):
        qs = super().get_queryset()
        # Customers see only documents published to them
        provider_buildings = access.accessible_building_ids(
            self.request.user, roles=access.PROVIDER_ROLES
        )
        return qs.filter(building__in=provider_buildings) | qs.filter(is_published=True)
