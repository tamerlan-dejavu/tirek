"""
Customer (ОСИ) cabinet. Read-only aggregates over PUBLISHED data only (ТЗ 5.10, AC-14).
Management decisions on work orders go through `/work-orders/{id}/transition/`,
where the role rules of ТЗ 5.8 are enforced.
"""

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.buildings.models import Building
from apps.buildings.serializers import BuildingSerializer
from apps.core import access
from apps.defects.models import OPEN_STATUSES, Defect
from apps.inspections.models import Inspection
from apps.organizations.models import Role
from apps.reports.models import Report
from apps.workorders.models import WorkOrder, WorkOrderStatus

ACTIVE_WORK = [
    WorkOrderStatus.PROPOSED,
    WorkOrderStatus.AGREED,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.POSTPONED,
]


def _customer_buildings(user):
    return Building.objects.filter(
        id__in=access.accessible_building_ids(user, roles={Role.OSI_REPRESENTATIVE})
    )


def _published_defects(building):
    return Defect.objects.filter(
        building=building, current_risk__isnull=False, inspection__published_at__isnull=False
    )


def _summary(building):
    defects = _published_defects(building).filter(status__in=OPEN_STATUSES)
    by_risk = dict(defects.values_list("current_risk__category").annotate(n=Count("id")).order_by())
    today = timezone.localdate()
    work = WorkOrder.objects.filter(building=building, status__in=ACTIVE_WORK)
    last = (
        Inspection.objects.filter(building=building, published_at__isnull=False)
        .order_by("-approved_at")
        .first()
    )
    return {
        "open_defects": defects.count(),
        "open_defects_by_risk": {k: by_risk.get(k, 0) for k in ("R1", "R2", "R3", "R4")},
        "active_work_orders": work.count(),
        "awaiting_decision": work.filter(status=WorkOrderStatus.PROPOSED).count(),
        "overdue_work_orders": work.filter(planned_date__lt=today).count(),
        "last_inspection": (
            {"id": str(last.pk), "number": last.number, "approved_at": last.approved_at}
            if last
            else None
        ),
    }


@api_view(["GET"])
def my_buildings(request):
    rows = []
    for b in _customer_buildings(request.user):
        rows.append(
            {**BuildingSerializer(b, context={"request": request}).data, "summary": _summary(b)}
        )
    return Response(rows)


@api_view(["GET"])
def building_overview(request, pk):
    building = get_object_or_404(_customer_buildings(request.user), pk=pk)
    inspections = Inspection.objects.filter(building=building, published_at__isnull=False)
    reports = Report.objects.filter(building=building, published_at__isnull=False)
    return Response(
        {
            "building": BuildingSerializer(building, context={"request": request}).data,
            "summary": _summary(building),
            "inspections": [
                {
                    "id": str(i.pk),
                    "number": i.number,
                    "version": i.version,
                    "approved_at": i.approved_at,
                    "published_at": i.published_at,
                }
                for i in inspections.order_by("-approved_at")
            ],
            "reports": [
                {
                    "id": str(r.pk),
                    "inspection": str(r.inspection_id),
                    "version": r.version,
                    "published_at": r.published_at,
                }
                for r in reports
            ],
        }
    )
