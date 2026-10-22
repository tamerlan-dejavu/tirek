from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.core import access
from apps.organizations.models import OrganizationMembership, Role

from . import services
from .models import FileKind, FileLink, StoredFile
from .serializers import LINK_TARGETS, LinkSerializer, StoredFileSerializer, UploadSerializer

UPLOADERS = (
    Role.FIELD_SPECIALIST,
    Role.REVIEWING_ENGINEER,
    Role.PROVIDER_ADMIN,
    Role.PRODUCTION_PLANNER,
    Role.DISPATCHER,
    Role.OSI_REPRESENTATIVE,
    Role.RESIDENT,  # only to their own request, see upload()
)


def _building_id_of(obj):
    if hasattr(obj, "building_id"):
        return obj.building_id
    for parent in ("inspection", "defect"):
        if hasattr(obj, parent):
            return getattr(obj, parent).building_id
    return None


def resolve_target(target_type: str, target_id, building_id):
    """Load the object a file is attached to and make sure it is in the same building."""
    model = ContentType.objects.get_by_natural_key(*LINK_TARGETS[target_type]).model_class()
    obj = model.objects.filter(pk=target_id).first()
    if obj is None:
        raise NotFound("Объект не найден.")
    obj_building = obj.pk if target_type == "building" else _building_id_of(obj)
    if obj_building != building_id:
        raise ValidationError("Объект принадлежит другому зданию.")
    return obj


def _attach(stored: StoredFile, target, user) -> None:
    FileLink.objects.get_or_create(
        file=stored,
        content_type=ContentType.objects.get_for_model(target),
        object_id=str(target.pk),
        defaults={"created_by": user},
    )


class StoredFileViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = StoredFileSerializer
    filterset_fields = ["building", "kind"]

    def get_queryset(self):
        user = self.request.user
        provider_buildings = access.accessible_building_ids(user, roles=access.PROVIDER_ROLES)
        # Customers list only published documents/reports; other files come via portal views.
        # Everyone always sees what they uploaded themselves (e.g. a resident's request photos).
        qs = (
            StoredFile.objects.filter(
                (
                    Q(building__in=access.accessible_building_ids(user))
                    & (
                        Q(building__in=provider_buildings)
                        | Q(buildingdocument__is_published=True)
                        | Q(report__published_at__isnull=False)
                    )
                )
                | Q(uploaded_by=user)
            )
            .distinct()
            .order_by("-created_at")
        )
        target_type = self.request.query_params.get("target_type")
        target_id = self.request.query_params.get("target_id")
        if target_type in LINK_TARGETS and target_id:
            ct = ContentType.objects.get_by_natural_key(*LINK_TARGETS[target_type])
            qs = qs.filter(links__content_type=ct, links__object_id=target_id)
        return qs

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    @transaction.atomic
    def upload(self, request):
        data = UploadSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        building = v["building"]
        access.require(request.user, building.pk, *UPLOADERS)

        target = None
        if v.get("target_type"):
            target = resolve_target(v["target_type"], v["target_id"], building.pk)
        # A resident may attach files only to their own request
        if access.roles_for_building(request.user, building.pk) <= {Role.RESIDENT}:
            if v.get("target_type") != "service_request" or target.author_id != request.user.pk:
                raise PermissionDenied("Файлы можно прикрепить только к своей заявке.")
            if v["kind"] not in (FileKind.PHOTO, FileKind.VIDEO):
                raise PermissionDenied("Житель прикладывает фото или видео проблемы.")

        organization = (
            OrganizationMembership.objects.filter(
                user=request.user,
                is_active=True,
                organization__building_links__building=building,
            )
            .select_related("organization")
            .first()
        )
        stored = services.store_upload(
            v["file"],
            building=building,
            organization=organization.organization if organization else None,
            user=request.user,
            kind=v["kind"],
            caption=v["caption"],
        )
        if target is not None:
            _attach(stored, target, request.user)
        return Response(StoredFileSerializer(stored).data, status=201)

    @action(detail=True, methods=["post"])
    def link(self, request, pk=None):
        stored = self.get_object()
        access.require(request.user, stored.building_id, *UPLOADERS)
        data = LinkSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        target = resolve_target(
            data.validated_data["target_type"], data.validated_data["target_id"], stored.building_id
        )
        _attach(stored, target, request.user)
        return Response(status=204)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Access is checked on every request, then a short-lived signed URL (ТЗ 5.9)."""
        stored = self.get_object()
        if access.is_customer_only(request.user, stored.building_id) and not (
            _published_for_customer(stored)
        ):
            raise PermissionDenied()
        return services.file_response(stored)


def _published_for_customer(stored: StoredFile) -> bool:
    """Customers may download only files attached to something published to them."""
    from apps.buildings.models import BuildingDocument
    from apps.reports.models import Report

    if BuildingDocument.objects.filter(file=stored, is_published=True).exists():
        return True
    if Report.objects.filter(file=stored, published_at__isnull=False).exists():
        return True
    for link in stored.links.select_related("content_type"):
        model = link.content_type.model
        if model in ("workorder", "servicerequest"):
            return True
        obj = link.content_type.get_object_for_this_type(pk=link.object_id)
        inspection = obj if model == "inspection" else getattr(obj, "inspection", None)
        if inspection is not None and inspection.published_at:
            return True
    return False
