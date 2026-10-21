from rest_framework import mixins, viewsets
from rest_framework.response import Response

from apps.core import access
from apps.organizations.models import Role

from . import services
from .models import RiskAssessment
from .serializers import RiskAssessmentSerializer


class RiskAssessmentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """
    POST creates an assessment (or a revision). Only reviewing engineers (AC-10).
    GET lists the full revision history of a defect.
    """

    serializer_class = RiskAssessmentSerializer
    filterset_fields = ["defect", "category"]

    def get_queryset(self):
        return access.scope_to_buildings(
            RiskAssessment.objects.select_related("engineer"), self.request.user, "defect__building"
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        defect = serializer.validated_data.pop("defect")
        if not access.scope_to_buildings(
            type(defect).objects.filter(pk=defect.pk), request.user
        ).exists():
            return Response(status=404)
        access.require(request.user, defect.building_id, Role.REVIEWING_ENGINEER)
        assessment = services.assess(defect, request, **serializer.validated_data)
        return Response(self.get_serializer(assessment).data, status=201)
