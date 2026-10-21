"""
Operational indicators (ТЗ 5.12). Every number is a plain count with a stated definition —
no composite condition or safety scores (no approved methodology exists).
All figures are limited to buildings the user serves as a provider.
"""

from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.core import access
from apps.defects.models import OPEN_STATUSES, Defect, DefectEvent, DefectStatus, RiskCategory
from apps.inspections.models import Inspection, InspectionStatus
from apps.workorders.models import WorkOrder, WorkOrderEvent, WorkOrderStatus

DUE_SOON_DAYS = 14
TREND_MONTHS = 12
NOT_FINISHED = [
    WorkOrderStatus.PROPOSED,
    WorkOrderStatus.AGREED,
    WorkOrderStatus.SCHEDULED,
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.POSTPONED,
]
PENDING_VERIFICATION = [DefectStatus.IN_REVIEW, DefectStatus.FIX_REVIEW]


def _scope(request):
    return access.accessible_building_ids(request.user, roles=access.PROVIDER_ROLES)


@api_view(["GET"])
def dashboard(request):
    buildings = _scope(request)
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
            "inspections_scheduled": inspections.filter(
                status=InspectionStatus.DRAFT, planned_date__gte=today
            ).count(),
            "defects_open": defects.count(),
            "defects_r1": defects.filter(current_risk__category=RiskCategory.R1).count(),
            "defects_r2": defects.filter(current_risk__category=RiskCategory.R2).count(),
            "defects_pending_verification": defects.filter(status__in=PENDING_VERIFICATION).count(),
            "work_orders_due_soon": unfinished.filter(
                planned_date__gte=today, planned_date__lte=today + timedelta(days=DUE_SOON_DAYS)
            ).count(),
            "work_orders_overdue": unfinished.filter(planned_date__lt=today).count(),
            "work_orders_completed": work.filter(
                status__in=[WorkOrderStatus.DONE, WorkOrderStatus.VERIFIED, WorkOrderStatus.CLOSED]
            ).count(),
            "generated_at": timezone.now(),
        }
    )


def _counts(qs, field):
    return dict(qs.values_list(field).annotate(n=Count("id")).order_by())


@api_view(["GET"])
def breakdown(request):
    """Distributions for analytics charts. Unassessed defects are reported separately."""
    buildings = _scope(request)
    building = request.query_params.get("building")
    if building:
        buildings = buildings.filter(id=building)

    defects = Defect.objects.filter(building__in=buildings).exclude(status=DefectStatus.REJECTED)
    open_defects = defects.filter(status__in=OPEN_STATUSES)
    work = WorkOrder.objects.filter(building__in=buildings)

    start = (timezone.localdate().replace(day=1) - timedelta(days=31 * (TREND_MONTHS - 1))).replace(
        day=1
    )
    detected = dict(
        defects.filter(detected_on__gte=start)
        .annotate(m=TruncMonth("detected_on"))
        .values_list("m")
        .annotate(n=Count("id"))
        .order_by()
    )
    closed = dict(
        defects.filter(closed_at__date__gte=start)
        .annotate(m=TruncMonth("closed_at"))
        .values_list("m")
        .annotate(n=Count("id"))
        .order_by()
    )

    def month_key(d):
        return d.strftime("%Y-%m") if d else None

    months = []
    cursor = start
    for _ in range(TREND_MONTHS):
        months.append(cursor)
        cursor = (cursor + timedelta(days=32)).replace(day=1)
    detected_by = {month_key(k): v for k, v in detected.items()}
    closed_by = {month_key(k): v for k, v in closed.items()}

    by_risk = _counts(open_defects, "current_risk__category")
    return Response(
        {
            "open_by_risk": {
                **{c: by_risk.get(c, 0) for c in RiskCategory.values},
                "unassessed": by_risk.get(None, 0),
            },
            "open_by_group": _counts(open_defects, "element__element_type__group"),
            "open_by_element_type": _counts(open_defects, "element__element_type__name"),
            "by_status": _counts(defects, "status"),
            "work_orders_by_status": _counts(work, "status"),
            "monthly": [
                {
                    "month": month_key(m),
                    "detected": detected_by.get(month_key(m), 0),
                    "closed": closed_by.get(month_key(m), 0),
                }
                for m in months
            ],
        }
    )


@api_view(["GET"])
def activity(request):
    """Recent defect and work-order events in scope, newest first."""
    buildings = _scope(request)
    limit = min(int(request.query_params.get("limit", 15)), 50)
    defect_events = (
        DefectEvent.objects.filter(defect__building__in=buildings)
        .select_related("defect", "actor")
        .order_by("-created_at")[:limit]
    )
    work_events = (
        WorkOrderEvent.objects.filter(work_order__building__in=buildings)
        .select_related("work_order", "actor")
        .order_by("-created_at")[:limit]
    )

    rows = [
        {
            "id": str(e.pk),
            "kind": "defect",
            "object_id": str(e.defect_id),
            "object_number": e.defect.number,
            "title": e.defect.defect_type,
            "to_status": e.to_status,
            "actor": str(e.actor),
            "comment": e.comment,
            "at": e.created_at,
        }
        for e in defect_events
    ] + [
        {
            "id": str(e.pk),
            "kind": "work_order",
            "object_id": str(e.work_order_id),
            "object_number": e.work_order.number,
            "title": e.work_order.title,
            "to_status": e.to_status,
            "actor": str(e.actor),
            "comment": e.reason,
            "at": e.created_at,
        }
        for e in work_events
    ]
    rows.sort(key=lambda r: r["at"], reverse=True)
    return Response(rows[:limit])
