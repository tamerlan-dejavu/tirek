from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core import access
from apps.defects.models import OPEN_STATUSES, Defect, RiskCategory
from apps.inspections.models import Inspection, InspectionStatus
from apps.workorders.models import WorkOrder, WorkOrderStatus

DUE_SOON_DAYS = 14
NOT_FINISHED = [
    WorkOrderStatus.PROPOSED,
    WorkOrderStatus.AGREED,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.POSTPONED,
]


@api_view(["GET"])
def dashboard(request):
    """Initial indicators (ТЗ 5.12), always within the user's access scope."""
    buildings = access.accessible_building_ids(request.user, roles=access.PROVIDER_ROLES)
    today = timezone.localdate()

    inspections = Inspection.objects.filter(building__in=buildings)
    defects = Defect.objects.filter(building__in=buildings, status__in=OPEN_STATUSES)
    work = WorkOrder.objects.filter(building__in=buildings)
    unfinished = work.filter(status__in=NOT_FINISHED, planned_date__isnull=False)

    return Response(
        {
            "buildings": buildings.count(),
            "inspections_total": inspections.exclude(status=InspectionStatus.CANCELLED).count(),
            "inspections_awaiting_review": inspections.filter(
                status=InspectionStatus.SUBMITTED
            ).count(),
            "defects_open": defects.count(),
            "defects_r1": defects.filter(current_risk__category=RiskCategory.R1).count(),
            "defects_r2": defects.filter(current_risk__category=RiskCategory.R2).count(),
            "work_orders_due_soon": unfinished.filter(
                planned_date__gte=today, planned_date__lte=today + timedelta(days=DUE_SOON_DAYS)
            ).count(),
            "work_orders_overdue": unfinished.filter(planned_date__lt=today).count(),
            "work_orders_completed": work.filter(
                status__in=[WorkOrderStatus.DONE, WorkOrderStatus.VERIFIED, WorkOrderStatus.CLOSED]
            ).count(),
        }
    )
