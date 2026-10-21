from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from apps.core import access
from apps.files.services import file_response
from apps.inspections.models import Inspection
from apps.organizations.models import Role

from . import services
from .models import Report, ReportStatus

AUTHORS = (Role.REVIEWING_ENGINEER, Role.PROVIDER_ADMIN)


class ReportSerializer(serializers.ModelSerializer):
    inspection_number = serializers.CharField(source="inspection.number", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "inspection",
            "inspection_number",
            "building",
            "version",
            "status",
            "sha256",
            "error",
            "generated_by",
            "generated_at",
            "published_at",
            "created_at",
        ]
        read_only_fields = fields


class GenerateSerializer(serializers.Serializer):
    inspection = serializers.UUIDField()


class ReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReportSerializer
    filterset_fields = ["building", "inspection", "status"]

    def get_queryset(self):
        qs = access.scope_to_buildings(
            Report.objects.select_related("inspection"), self.request.user
        )
        provider_buildings = access.accessible_building_ids(
            self.request.user, roles=access.PROVIDER_ROLES
        )
        return qs.filter(building__in=provider_buildings) | qs.filter(published_at__isnull=False)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        data = GenerateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        inspection = (
            access.scope_to_buildings(Inspection.objects.all(), request.user)
            .filter(pk=data.validated_data["inspection"])
            .first()
        )
        if inspection is None:
            raise NotFound()
        access.require(request.user, inspection.building_id, *AUTHORS)
        report = services.request_report(inspection, request)
        return Response(ReportSerializer(report).data, status=202)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        report = self.get_object()
        access.require(request.user, report.building_id, *AUTHORS)
        return Response(ReportSerializer(services.publish(report, request)).data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        report = self.get_object()
        if report.status != ReportStatus.READY or report.file is None:
            raise NotFound("Отчёт ещё не готов.")
        return file_response(report.file)
