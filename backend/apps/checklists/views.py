from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.organizations.models import OrganizationMembership, Role

from .models import ChecklistItem, ChecklistTemplate, ChecklistTemplateVersion
from .serializers import (
    ChecklistItemSerializer,
    ChecklistTemplateSerializer,
    ChecklistTemplateVersionSerializer,
)

AUTHORS = (Role.PROVIDER_ADMIN, Role.REVIEWING_ENGINEER)


def _member_org_ids(user, roles=None):
    qs = OrganizationMembership.objects.filter(user=user, is_active=True)
    if roles:
        qs = qs.filter(role__in=roles)
    return qs.values("organization_id")


def _require_author(user, organization_id):
    if not OrganizationMembership.objects.filter(
        user=user, organization_id=organization_id, role__in=AUTHORS, is_active=True
    ).exists():
        raise PermissionDenied("Недостаточно прав для редактирования шаблонов.")


class ChecklistTemplateViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ChecklistTemplateSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ["organization", "inspection_type", "is_active", "building_type"]

    def get_queryset(self):
        return ChecklistTemplate.objects.filter(
            organization_id__in=_member_org_ids(self.request.user)
        ).order_by("name")

    def perform_create(self, serializer):
        _require_author(self.request.user, serializer.validated_data["organization"].pk)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        _require_author(self.request.user, serializer.instance.organization_id)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="new-version")
    @transaction.atomic
    def new_version(self, request, pk=None):
        """Start a new draft, copying items from the latest version."""
        template = self.get_object()
        _require_author(request.user, template.organization_id)
        latest = template.versions.first()
        number = (template.versions.aggregate(m=Max("number"))["m"] or 0) + 1
        draft = ChecklistTemplateVersion.objects.create(
            template=template, number=number, created_by=request.user
        )
        if latest:
            for item in latest.items.all():
                item.pk = None
                item.version = draft
                item.save()
        return Response(ChecklistTemplateVersionSerializer(draft).data, status=201)


class ChecklistTemplateVersionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChecklistTemplateVersionSerializer
    filterset_fields = ["template", "status"]

    def get_queryset(self):
        return ChecklistTemplateVersion.objects.filter(
            template__organization_id__in=_member_org_ids(self.request.user)
        ).prefetch_related("items")

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def publish(self, request, pk=None):
        version = self.get_object()
        _require_author(request.user, version.template.organization_id)
        if not version.is_editable:
            raise ValidationError("Версия уже опубликована.")
        if not version.items.exists():
            raise ValidationError("Нельзя опубликовать пустой чек-лист.")
        version.template.versions.filter(status=ChecklistTemplateVersion.Status.PUBLISHED).update(
            status=ChecklistTemplateVersion.Status.ARCHIVED
        )
        version.status = ChecklistTemplateVersion.Status.PUBLISHED
        version.published_at = timezone.now()
        version.published_by = request.user
        version.approved_by_note = request.data.get("approved_by_note", version.approved_by_note)
        version.save()
        return Response(self.get_serializer(version).data)


class ChecklistItemViewSet(
    mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = ChecklistItemSerializer
    http_method_names = ["post", "patch"]

    def get_queryset(self):
        return ChecklistItem.objects.filter(
            version__template__organization_id__in=_member_org_ids(self.request.user, AUTHORS),
            version__status=ChecklistTemplateVersion.Status.DRAFT,
        )

    def perform_create(self, serializer):
        _require_author(
            self.request.user, serializer.validated_data["version"].template.organization_id
        )
        serializer.save()
