import django_filters
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core import access
from apps.core.viewsets import BuildingScopedViewSet
from apps.organizations.models import Role

from . import services
from .models import Priority, WorkOrder, WorkOrderComment, WorkOrderStatus
from .serializers import (
    TransitionSerializer,
    WorkOrderCommentSerializer,
    WorkOrderEventSerializer,
    WorkOrderSerializer,
)

FINAL = [WorkOrderStatus.CLOSED, WorkOrderStatus.REJECTED, WorkOrderStatus.CANCELLED]


class WorkOrderFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=WorkOrderStatus.choices)
    priority = django_filters.MultipleChoiceFilter(choices=Priority.choices)
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
    queryset = WorkOrder.objects.select_related("building", "defect__current_risk", "created_by")
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
