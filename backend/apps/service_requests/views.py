from django.conf import settings
from django.db import IntegrityError
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import User
from apps.buildings.models import Building
from apps.core import access
from apps.organizations.models import (
    BuildingOrganizationLink,
    OrganizationMembership,
    OrganizationType,
    Role,
)
from apps.workorders.models import WorkOrder, WorkOrderStatus

from . import services
from .models import (
    ACTIVE_WORK_STATUSES,
    OPEN_REQUEST_STATUSES,
    Poll,
    PollOption,
    PollVote,
    RequestSource,
    RequestStatus,
    ServiceRequest,
)
from .serializers import (
    AssignSerializer,
    CreateDefectSerializer,
    PollSerializer,
    PrioritySerializer,
    ServiceRequestEventSerializer,
    ServiceRequestSerializer,
    TextSerializer,
)

R = RequestStatus
DISPATCH = (Role.DISPATCHER, Role.PROVIDER_ADMIN)
# Spec §11 sources: resident, specialist, dispatcher, engineer (and the ОСИ representative)
REGISTRARS = (
    Role.DISPATCHER,
    Role.PROVIDER_ADMIN,
    Role.OSI_REPRESENTATIVE,
    Role.FIELD_SPECIALIST,
    Role.REVIEWING_ENGINEER,
)
SOURCE_BY_ROLE = [
    (Role.DISPATCHER, RequestSource.DISPATCHER),
    (Role.PROVIDER_ADMIN, RequestSource.DISPATCHER),
    (Role.REVIEWING_ENGINEER, RequestSource.ENGINEER),
    (Role.FIELD_SPECIALIST, RequestSource.SPECIALIST),
    (Role.OSI_REPRESENTATIVE, RequestSource.OSI),
]
# Checking the result: the engineer or the dispatcher, never the executor themselves
VERIFIERS = (Role.REVIEWING_ENGINEER, *DISPATCH)
ASSIGNABLE = [Role.FIELD_SPECIALIST, Role.PRODUCTION_PLANNER, Role.REVIEWING_ENGINEER]
POLL_ORGANIZERS = (Role.OSI_REPRESENTATIVE, Role.PROVIDER_ADMIN)


class ServiceRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ServiceRequestSerializer
    filterset_fields = [
        "building",
        "status",
        "category",
        "is_emergency",
        "assignee",
        "priority",
        "source",
    ]
    search_fields = ["number", "description", "building__address", "apartment"]
    ordering_fields = ["created_at", "due_date"]

    def get_queryset(self):
        user = self.request.user
        qs = ServiceRequest.objects.select_related("building", "author", "assignee", "defect")
        # Staff and ОСИ: requests of their buildings. Residents: only their own.
        return qs.filter(Q(building__in=access.accessible_building_ids(user)) | Q(author=user))

    throttle_scope = "service_request"

    def get_throttles(self):
        # Only submitting is limited; reading and processing requests are not
        return [ScopedRateThrottle()] if self.action == "create" else super().get_throttles()

    def perform_create(self, serializer):
        user = self.request.user
        building = serializer.validated_data["building"]
        roles = access.roles_for_building(user, building.pk)
        staff_source = next((src for role, src in SOURCE_BY_ROLE if role in roles), None)
        is_resident = staff_source is None and (
            access.resident_building_ids(user).filter(id=building.pk).exists()
        )
        if not is_resident and staff_source is None:
            raise PermissionDenied("Вы не можете подать заявку по этому дому.")
        serializer.save(
            number=services.next_number(),
            author=user if is_resident else None,
            source=RequestSource.RESIDENT if is_resident else staff_source,
            priority=services.default_priority(serializer.validated_data.get("is_emergency")),
            created_by=user,
        )

    def _dispatcher(self, req):
        access.require(
            self.request.user, req.building_id, *DISPATCH, message="Действие доступно диспетчеру."
        )

    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        return Response(
            ServiceRequestEventSerializer(self.get_object().events.all(), many=True).data
        )

    def _text(self):
        data = TextSerializer(data=self.request.data)
        data.is_valid(raise_exception=True)
        return data.validated_data["text"]

    def _executor_or_dispatcher(self, req):
        if req.assignee_id != self.request.user.pk:
            self._dispatcher(req)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        req = self.get_object()
        self._dispatcher(req)
        services.change_status(req, R.ACCEPTED, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def prioritize(self, request, pk=None):
        req = self.get_object()
        self._dispatcher(req)
        data = PrioritySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        priority = data.validated_data["priority"]
        if priority != req.priority:
            req.priority = priority
            req.save(update_fields=["priority", "updated_at"])
            services.note(req, request, f"Приоритет: {req.get_priority_display().lower()}")
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Distribute the task: executor, deadline, priority. Reassignment keeps the status."""
        req = self.get_object()
        self._dispatcher(req)
        if req.status not in (R.NEW, R.ACCEPTED, *ACTIVE_WORK_STATUSES):
            raise ValidationError("Заявку на этом этапе нельзя переназначить.")
        data = AssignSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        assignee = data.validated_data["assignee"]
        if not access.has_role(assignee, req.building_id, *ASSIGNABLE):
            raise ValidationError({"assignee": "Исполнитель не обслуживает этот дом."})
        reassigned = req.assignee_id is not None and req.assignee_id != assignee.pk
        req.assignee = assignee
        req.due_date = data.validated_data.get("due_date")
        if data.validated_data.get("priority"):
            req.priority = data.validated_data["priority"]
        req.save(update_fields=["assignee", "due_date", "priority", "updated_at"])
        comment = data.validated_data["comment"] or f"Исполнитель: {assignee}"
        if req.status == R.NEW:
            services.change_status(req, R.ACCEPTED, request)
        if req.status == R.ACCEPTED:
            services.change_status(req, R.ASSIGNED, request, comment)
        elif reassigned:
            services.note(req, request, f"Переназначена. {comment}")
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        req = self.get_object()
        self._executor_or_dispatcher(req)
        services.change_status(req, R.IN_PROGRESS, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Executor: work done. Requires a description and a result photo."""
        req = self.get_object()
        self._executor_or_dispatcher(req)
        services.complete(req, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        req = self.get_object()
        access.require(
            request.user, req.building_id, *VERIFIERS, message="Проверяет инженер или диспетчер."
        )
        if req.assignee_id == request.user.pk:
            raise PermissionDenied("Исполнитель не может сам проверить свою работу.")
        services.change_status(req, R.VERIFIED, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"], url_path="return")
    def return_to_work(self, request, pk=None):
        req = self.get_object()
        access.require(request.user, req.building_id, *VERIFIERS)
        services.return_to_work(req, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        req = self.get_object()
        self._dispatcher(req)
        services.change_status(req, R.CLOSED, request, self._text())
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        req = self.get_object()
        self._dispatcher(req)
        data = TextSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        services.reject(req, request, data.validated_data["text"])
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"], url_path="confirm-emergency")
    def confirm_emergency(self, request, pk=None):
        req = self.get_object()
        self._dispatcher(req)
        services.confirm_emergency(req, request)
        return Response(self.get_serializer(req).data)

    @action(detail=True, methods=["post"], url_path="create-defect")
    def create_defect(self, request, pk=None):
        req = self.get_object()
        access.require(
            request.user, req.building_id, *DISPATCH, Role.REVIEWING_ENGINEER, Role.FIELD_SPECIALIST
        )
        data = CreateDefectSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        defect = services.create_defect(req, request, **data.validated_data)
        return Response({"defect": str(defect.pk), "number": defect.number}, status=201)

    @action(detail=False, methods=["get"])
    def assignees(self, request):
        """Staff who can take a task in the given building (for the dispatcher's picker)."""
        building = request.query_params.get("building")
        if not building or not access.has_role(request.user, building, *DISPATCH):
            raise PermissionDenied()
        orgs = BuildingOrganizationLink.objects.filter(
            building_id=building,
            valid_to__isnull=True,
            organization__type=OrganizationType.PROVIDER,
        ).values("organization_id")
        users = (
            User.objects.filter(
                memberships__organization_id__in=orgs,
                memberships__role__in=ASSIGNABLE,
                memberships__is_active=True,
                is_active=True,
            )
            .distinct()
            .order_by("full_name")
        )
        return Response(
            [
                {
                    "id": str(u.pk),
                    "name": str(u),
                    "position": u.position,
                    "open_tasks": u.assigned_service_requests.filter(
                        status__in=ACTIVE_WORK_STATUSES
                    ).count(),
                }
                for u in users
            ]
        )


class PollViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PollSerializer
    filterset_fields = ["building"]

    def initial(self, request, *args, **kwargs):
        # Residents' voting is outside the MVP (ТЗ 3.2): off unless enabled
        if not settings.FEATURE_POLLS:
            raise NotFound()
        super().initial(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        buildings = Q(building__in=access.resident_building_ids(user)) | Q(
            building__in=access.accessible_building_ids(user)
        )
        return (
            Poll.objects.filter(buildings)
            .filter(Q(is_published=True) | Q(created_by=user))
            .prefetch_related("options")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["organizer"] = OrganizationMembership.objects.filter(
            user=self.request.user, role__in=POLL_ORGANIZERS, is_active=True
        ).exists()
        return ctx

    def perform_create(self, serializer):
        access.require(
            self.request.user, serializer.validated_data["building"].pk, *POLL_ORGANIZERS
        )
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        if not access.resident_building_ids(request.user).filter(id=poll.building_id).exists():
            raise PermissionDenied("Голосуют жители этого дома.")
        option = PollOption.objects.filter(poll=poll, pk=request.data.get("option")).first()
        if option is None:
            raise ValidationError({"option": "Выберите вариант."})
        try:
            PollVote.objects.create(poll=poll, option=option, user=request.user)
        except IntegrityError as exc:
            raise ValidationError("Вы уже ответили на этот опрос.") from exc
        return Response(self.get_serializer(poll).data)


PUBLIC_WORK = [
    WorkOrderStatus.AGREED,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.DONE,
    WorkOrderStatus.VERIFIED,
    WorkOrderStatus.CLOSED,
]


@api_view(["GET"])
def resident_overview(request):
    """
    What a resident sees about their building: planned and completed works agreed by ОСИ,
    their own requests. No engineering risk details (they need context and are not public).
    """
    rows = []
    for building in Building.objects.filter(id__in=access.resident_building_ids(request.user)):
        b = building.pk
        works = (
            WorkOrder.objects.filter(building_id=b, status__in=PUBLIC_WORK)
            .order_by("planned_date")
            .values("id", "title", "status", "planned_date", "completed_at")
        )
        rows.append(
            {
                "id": str(b),
                "address": building.address,
                "internal_code": building.internal_code,
                "works": [
                    {**w, "id": str(w["id"]), "status_label": WorkOrderStatus(w["status"]).label}
                    for w in works
                ],
                "open_requests": ServiceRequest.objects.filter(
                    building_id=b, author=request.user, status__in=OPEN_REQUEST_STATUSES
                ).count(),
            }
        )
    return Response(rows)
