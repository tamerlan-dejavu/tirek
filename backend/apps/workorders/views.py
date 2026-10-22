import django_filters
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.buildings.models import Building
from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet
from apps.organizations.models import OrganizationMembership, Role

from . import planning, services
from .models import (
    MaintenanceRule,
    Periodicity,
    Priority,
    WorkKind,
    WorkOrder,
    WorkOrderComment,
    WorkOrderStatus,
    WorkType,
)
from .serializers import (
    GeneratePlanSerializer,
    MaintenanceRuleSerializer,
    TransitionSerializer,
    WorkOrderCommentSerializer,
    WorkOrderEventSerializer,
    WorkOrderSerializer,
)

FINAL = [WorkOrderStatus.CLOSED, WorkOrderStatus.REJECTED, WorkOrderStatus.CANCELLED]


class WorkOrderFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=WorkOrderStatus.choices)
    priority = django_filters.MultipleChoiceFilter(choices=Priority.choices)
    kind = django_filters.ChoiceFilter(choices=WorkKind.choices)
    work_type = django_filters.MultipleChoiceFilter(choices=WorkType.choices)
    periodicity = django_filters.ChoiceFilter(choices=Periodicity.choices)
    overdue = django_filters.BooleanFilter(method="filter_overdue")
    planned_from = django_filters.DateFilter(field_name="planned_date", lookup_expr="gte")
    planned_to = django_filters.DateFilter(field_name="planned_date", lookup_expr="lte")

    class Meta:
        model = WorkOrder
        fields = ["building", "defect", "element", "responsible"]

    def filter_overdue(self, qs, name, value):
        overdue = qs.filter(planned_date__lt=timezone.localdate()).exclude(
            status__in=FINAL + [WorkOrderStatus.DONE, WorkOrderStatus.VERIFIED]
        )
        return overdue if value else qs.exclude(pk__in=overdue)


class WorkOrderViewSet(BuildingScopedViewSet):
    queryset = WorkOrder.objects.select_related(
        "building", "defect__current_risk", "created_by", "responsible", "element"
    )
    serializer_class = WorkOrderSerializer
    filterset_class = WorkOrderFilter
    search_fields = ["number", "title", "building__address"]
    ordering_fields = ["planned_date", "priority", "created_at"]
    create_roles = (Role.REVIEWING_ENGINEER,)  # UC-06: engineer recommends
    # ПТО sets dates, executors and resources (materials, labor)
    update_roles = (Role.REVIEWING_ENGINEER, Role.PROVIDER_ADMIN, Role.PRODUCTION_PLANNER)

    def perform_create(self, serializer):
        access.require(
            self.request.user, serializer.validated_data["building"].pk, *self.create_roles
        )
        serializer.save(created_by=self.request.user, number=services.next_number())

    # Engineer builds the plan from inspection data; ПТО may refresh it
    planner_roles = (Role.REVIEWING_ENGINEER, Role.PRODUCTION_PLANNER, Role.PROVIDER_ADMIN)

    @action(detail=False, methods=["post"], url_path="generate-plan")
    def generate_plan(self, request):
        """Spec §10: preliminary plan from confirmed defects and the passport-based regulation."""
        data = GeneratePlanSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        building = get_object_or_404(
            Building.objects.filter(pk__in=access.accessible_building_ids(request.user)),
            pk=data.validated_data["building"],
        )
        access.require(request.user, building.pk, *self.planner_roles)
        result = planning.generate(building, request.user, data.validated_data.get("year"))
        return Response(result, status=201)

    @action(detail=False, methods=["get"], url_path="annual-plan")
    def annual_plan(self, request):
        """Annual ППР grid: works × 12 months. Optional ?building= narrows to one house."""
        year = int(request.query_params.get("year") or timezone.localdate().year)
        ids = access.accessible_building_ids(request.user)
        if b := request.query_params.get("building"):
            ids = ids.filter(pk=b)
        return Response({"year": year, "rows": planning.annual(ids, year)})

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        work_order = self.get_object()
        data = TransitionSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.transition(
            work_order, data.validated_data["status"], request, data.validated_data["reason"]
        )
        return Response(self.get_serializer(work_order).data)

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        return Response(WorkOrderEventSerializer(self.get_object().events.all(), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, pk=None):
        work_order = self.get_object()
        if request.method == "GET":
            return Response(WorkOrderCommentSerializer(work_order.comments.all(), many=True).data)
        data = WorkOrderCommentSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        comment = WorkOrderComment.objects.create(
            work_order=work_order, author=request.user, text=data.validated_data["text"]
        )
        return Response(WorkOrderCommentSerializer(comment).data, status=201)


class MaintenanceRuleViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    """
    Typical preventive maintenance regulation (ППР). Provider staff read it; the provider
    administrator maintains it. Rules are deactivated, never deleted.
    """

    serializer_class = MaintenanceRuleSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if not OrganizationMembership.objects.filter(
            user=self.request.user, role__in=access.PROVIDER_ROLES, is_active=True
        ).exists():
            return MaintenanceRule.objects.none()
        qs = MaintenanceRule.objects.select_related("element_type")
        if self.request.query_params.get("all") != "1":
            qs = qs.filter(is_active=True)
        return qs

    def _require_admin(self):
        if not OrganizationMembership.objects.filter(
            user=self.request.user, role=Role.PROVIDER_ADMIN, is_active=True
        ).exists():
            raise PermissionDenied("Регламент ведёт администратор.")

    def perform_create(self, serializer):
        self._require_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._require_admin()
        serializer.save()
