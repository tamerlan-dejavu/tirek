from django.db.models import Q, Value
from django.db.models.functions import Coalesce
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet
from apps.organizations.models import Role

from . import services
from .filters import DefectFilter
from .models import Defect, DefectObservation, DefectStatus
from .serializers import (
    BasisSerializer,
    CommentSerializer,
    DefectEventSerializer,
    DefectObservationSerializer,
    DefectSerializer,
    ReasonSerializer,
)

FIELD = (Role.FIELD_SPECIALIST, Role.REVIEWING_ENGINEER, Role.PROVIDER_ADMIN)
REVIEWERS = (Role.REVIEWING_ENGINEER,)

# What the customer (ОСИ) can see: reviewed defects of published inspections or standalone
CUSTOMER_VISIBLE = [
    DefectStatus.CONFIRMED,
    DefectStatus.PLANNED,
    DefectStatus.FIXING,
    DefectStatus.FIX_REVIEW,
    DefectStatus.CLOSED,
]


class DefectViewSet(BuildingScopedViewSet):
    queryset = Defect.objects.select_related(
        "building",
        "element__element_type",
        "element__parent",
        "current_risk",
        "inspection",
        "created_by",
    )
    serializer_class = DefectSerializer
    filterset_class = DefectFilter
    search_fields = ["number", "building__address", "description", "defect_type", "location"]
    # risk_order: R1…R4 first, unassessed (preliminary only) after them
    ordering_fields = ["created_at", "detected_on", "current_risk__category", "risk_order"]
    create_roles = FIELD
    update_roles = FIELD

    def get_queryset(self):
        qs = super().get_queryset()
        provider_buildings = access.accessible_building_ids(
            self.request.user, roles=access.PROVIDER_ROLES
        )
        visible = qs.filter(building__in=provider_buildings) | qs.filter(
            Q(inspection__isnull=True) | Q(inspection__published_at__isnull=False),
            status__in=CUSTOMER_VISIBLE,
            current_risk__isnull=False,
        )
        return visible.annotate(risk_order=Coalesce("current_risk__category", Value("R9")))

    def perform_create(self, serializer):
        access.require(self.request.user, serializer.validated_data["building"].pk, *FIELD)
        serializer.save(created_by=self.request.user, number=services.next_number())

    def perform_update(self, serializer):
        if serializer.instance.status not in (
            DefectStatus.DETECTED,
            DefectStatus.NEEDS_CLARIFICATION,
        ):
            access.require(self.request.user, serializer.instance.building_id, *REVIEWERS)
        super().perform_update(serializer)

    @action(detail=True, methods=["post"])
    def resubmit(self, request, pk=None):
        """After clarification the specialist sends the defect back for review."""
        defect = self.get_object()
        access.require(request.user, defect.building_id, *FIELD)
        services.change_status(
            defect, DefectStatus.IN_REVIEW, request, request.data.get("comment", "")
        )
        return Response(self.get_serializer(defect).data)

    @action(detail=True, methods=["post"], url_path="request-clarification")
    def request_clarification(self, request, pk=None):
        defect = self.get_object()
        access.require(request.user, defect.building_id, *REVIEWERS)
        data = CommentSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.request_clarification(defect, request, data.validated_data["comment"])
        return Response(self.get_serializer(defect).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        defect = self.get_object()
        access.require(request.user, defect.building_id, *REVIEWERS)
        data = ReasonSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.reject(defect, request, data.validated_data["reason"])
        return Response(self.get_serializer(defect).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        defect = self.get_object()
        access.require(request.user, defect.building_id, *REVIEWERS)
        data = BasisSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.close(defect, request, data.validated_data["basis"])
        return Response(self.get_serializer(defect).data)

    @action(detail=True, methods=["get", "post"])
    def observations(self, request, pk=None):  # AC-17
        defect = self.get_object()
        if request.method == "GET":
            return Response(DefectObservationSerializer(defect.observations.all(), many=True).data)
        access.require(request.user, defect.building_id, *FIELD)
        data = DefectObservationSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        obs = DefectObservation.objects.create(
            defect=defect, observer=request.user, **data.validated_data
        )
        return Response(DefectObservationSerializer(obs).data, status=201)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        defect = self.get_object()
        return Response(DefectEventSerializer(defect.events.all(), many=True).data)
