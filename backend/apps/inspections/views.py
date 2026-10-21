from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet
from apps.organizations.models import Role

from . import services
from .models import Inspection, InspectionAnswer
from .serializers import (
    InspectionAnswerSerializer,
    InspectionReviewSerializer,
    InspectionSerializer,
    ReasonSerializer,
    ReturnSerializer,
)

PLANNERS = (Role.PROVIDER_ADMIN, Role.REVIEWING_ENGINEER)


class InspectionViewSet(BuildingScopedViewSet):
    queryset = Inspection.objects.select_related("building", "assignee", "template_version")
    serializer_class = InspectionSerializer
    filterset_fields = ["building", "status", "assignee", "inspection_type"]
    search_fields = ["number", "building__address"]
    ordering_fields = ["created_at", "planned_date", "submitted_at"]
    create_roles = PLANNERS  # UC-02
    update_roles = PLANNERS + (Role.FIELD_SPECIALIST,)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Customers see only published inspections (AC-11, AC-14)
        provider_buildings = access.accessible_building_ids(user, roles=access.PROVIDER_ROLES)
        return qs.filter(building__in=provider_buildings) | qs.filter(published_at__isnull=False)

    def perform_create(self, serializer):
        access.require(self.request.user, serializer.validated_data["building"].pk, *PLANNERS)
        serializer.save(created_by=self.request.user, number=services.next_number())

    def _require_assignee(self, inspection):
        if inspection.assignee_id != self.request.user.pk:
            raise PermissionDenied("Действие доступно только исполнителю обследования.")

    @action(detail=True, methods=["get"])
    def completeness(self, request, pk=None):
        inspection = self.get_object()
        return Response({"missing": services.missing_required(inspection)})

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):  # UC-04
        inspection = self.get_object()
        self._require_assignee(inspection)
        services.submit(inspection, request)
        return Response(self.get_serializer(inspection).data)

    @action(detail=True, methods=["post"], url_path="return")
    def return_for_rework(self, request, pk=None):  # AC-09
        inspection = self.get_object()
        access.require(request.user, inspection.building_id, Role.REVIEWING_ENGINEER)
        data = ReturnSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.return_for_rework(inspection, request, **data.validated_data)
        return Response(self.get_serializer(inspection).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):  # UC-05
        inspection = self.get_object()
        access.require(request.user, inspection.building_id, Role.REVIEWING_ENGINEER)
        services.approve(inspection, request, comment=request.data.get("comment", ""))
        return Response(self.get_serializer(inspection).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        inspection = self.get_object()
        access.require(request.user, inspection.building_id, *PLANNERS)
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.cancel(inspection, request, data.validated_data["reason"])
        return Response(self.get_serializer(inspection).data)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):  # UC-07
        inspection = self.get_object()
        access.require(request.user, inspection.building_id, *PLANNERS)
        services.publish(inspection, request)
        return Response(self.get_serializer(inspection).data)

    @action(detail=True, methods=["post"])
    def correction(self, request, pk=None):
        inspection = self.get_object()
        access.require(request.user, inspection.building_id, Role.REVIEWING_ENGINEER)
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        correction = services.create_correction(inspection, request, data.validated_data["reason"])
        return Response(self.get_serializer(correction).data, status=201)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        inspection = self.get_object()
        return Response(InspectionReviewSerializer(inspection.reviews.all(), many=True).data)


class InspectionAnswerViewSet(BuildingScopedViewSet):
    """Autosaved checklist answers (ТЗ 5.5, 11.7). Upsert by (inspection, item, element)."""

    queryset = InspectionAnswer.objects.select_related("item", "inspection")
    serializer_class = InspectionAnswerSerializer
    building_field = "inspection__building"
    filterset_fields = ["inspection", "item", "element"]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        provider_buildings = access.accessible_building_ids(
            self.request.user, roles=access.PROVIDER_ROLES
        )
        return qs.filter(inspection__building__in=provider_buildings) | qs.filter(
            inspection__published_at__isnull=False
        )

    def _require_editor(self, inspection):
        if inspection.assignee_id != self.request.user.pk:
            raise PermissionDenied("Заполнять может только исполнитель обследования.")

    def create(self, request, *args, **kwargs):
        existing = InspectionAnswer.objects.filter(
            inspection_id=request.data.get("inspection"),
            item_id=request.data.get("item"),
            element_id=request.data.get("element") or None,
        ).first()
        if existing:
            self.kwargs["pk"] = existing.pk
            return self.partial_update(request, *args, **kwargs)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        inspection = serializer.validated_data["inspection"]
        if inspection.building_id not in set(
            access.accessible_building_ids(self.request.user).values_list("id", flat=True)
        ):
            raise PermissionDenied()
        self._require_editor(inspection)
        serializer.save(answered_by=self.request.user)

    def perform_update(self, serializer):
        self._require_editor(serializer.instance.inspection)
        serializer.save(answered_by=self.request.user)
