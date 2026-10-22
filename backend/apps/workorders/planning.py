"""
Preliminary maintenance plan (spec §10): built from inspection data, not typed by hand.

* Reactive works — from confirmed defects that have no open work order yet. Priority comes
  from the defect, the recommended date from the response time of its risk level.
* Preventive works — from the typical regulation (MaintenanceRule) for every element or system
  the building passport marks as present. One work order per occurrence in the year.

Everything is created «Предложено»: the customer agrees, ПТО schedules. Re-running is safe —
existing works are not duplicated.
"""

import calendar
from datetime import date, timedelta

from django.db import transaction

from apps.buildings.models import BuildingElement, BuildingPassportEntry, Presence
from apps.defects.models import PRIORITY_BY_RISK, Defect, DefectStatus
from apps.risks.methodology import RESPONSE

from .models import MaintenanceRule, Periodicity, WorkKind, WorkOrder, WorkOrderStatus, WorkType
from .services import next_number

S = WorkOrderStatus
CLOSED = [S.CLOSED, S.REJECTED, S.CANCELLED]
ALL_MONTHS = list(range(1, 13))


def occurrences(rule: MaintenanceRule, year: int, start: date) -> list[date]:
    """Dates of a rule's occurrences in `year` not earlier than `start`'s month (mid-month)."""
    months = rule.months or ALL_MONTHS
    if rule.periodicity in (Periodicity.EVERY_3_YEARS, Periodicity.EVERY_5_YEARS):
        months = months[:1]
    dates = [date(year, m, min(15, calendar.monthrange(year, m)[1])) for m in months]
    return [d for d in dates if (d.year, d.month) >= (start.year, start.month)]


@transaction.atomic
def generate(building, user, year: int | None = None, today: date | None = None) -> dict:
    today = today or date.today()
    year = year or today.year
    start = today if year == today.year else date(year, 1, 1)
    created = {"reactive": [], "preventive": []}

    # 1 · confirmed defects without an open work order
    defects = (
        Defect.objects.filter(building=building, status=DefectStatus.CONFIRMED)
        .exclude(work_orders__status__in=[s for s in S.values if s not in CLOSED])
        .select_related("current_risk", "element")
    )
    for d in defects:
        risk = d.current_risk.category if d.current_risk_id else "R3"
        created["reactive"].append(
            _create(
                building,
                user,
                kind=WorkKind.REACTIVE,
                work_type=WorkType.REPAIR,
                defect=d,
                element=d.element,
                title=f"Устранение: {d.defect_type}",
                description=d.recommendations,
                basis=f"Дефект {d.number}, риск {risk} — {RESPONSE[risk]['action'].lower()}",
                priority=d.priority or PRIORITY_BY_RISK[risk],
                recommended_date=today + timedelta(days=RESPONSE[risk]["days"]),
            )
        )

    # 2 · typical regulation for elements present in the passport
    present = BuildingPassportEntry.objects.filter(
        building=building, presence=Presence.PRESENT
    ).values_list("element_type_id", flat=True)
    rules = MaintenanceRule.objects.filter(is_active=True, element_type__in=present)
    have = set(
        WorkOrder.objects.filter(building=building, rule__in=rules).values_list(
            "rule_id", "recommended_date"
        )
    )
    elements = {
        e.element_type_id: e
        for e in BuildingElement.objects.filter(building=building, is_active=True).order_by(
            "-created_at"
        )
    }
    for rule in rules:
        for when in occurrences(rule, year, start):
            if (rule.pk, when) in have:
                continue
            created["preventive"].append(
                _create(
                    building,
                    user,
                    kind=WorkKind.PREVENTIVE,
                    work_type=rule.work_type,
                    periodicity=rule.periodicity,
                    rule=rule,
                    element=elements.get(rule.element_type_id),
                    title=rule.title,
                    basis=f"Регламент ППР: {rule.get_periodicity_display().lower()}. {rule.note}",
                    priority="normal",
                    recommended_date=when,
                    materials=rule.materials,
                    labor_hours=rule.labor_hours,
                )
            )
    return {
        "year": year,
        "reactive": len(created["reactive"]),
        "preventive": len(created["preventive"]),
        "created": [w.pk for w in created["reactive"] + created["preventive"]],
    }


def _create(building, user, **fields) -> WorkOrder:
    return WorkOrder.objects.create(
        building=building, created_by=user, number=next_number(), **fields
    )


def annual(building_ids, year: int) -> list[dict]:
    """ППР grid: one row per work (rule or defect), 12 month cells with the work orders."""
    qs = (
        WorkOrder.objects.filter(building__in=building_ids)
        .exclude(status__in=[S.REJECTED, S.CANCELLED])
        .select_related("building", "rule__element_type", "element", "defect", "responsible")
    )
    rows: dict[tuple, dict] = {}
    for w in qs:
        when = w.planned_date or w.recommended_date
        if not when or when.year != year:
            continue
        key = (w.building_id, w.rule_id or w.defect_id or w.pk)
        row = rows.setdefault(
            key,
            {
                "key": f"{w.building_id}:{key[1]}",
                "building": str(w.building_id),
                "building_code": w.building.internal_code,
                "title": w.title,
                "element": w.element.name
                if w.element
                else (w.rule.element_type.name if w.rule else ""),
                "kind": w.kind,
                "work_type": w.work_type,
                "periodicity": w.periodicity,
                "priority": w.priority,
                "months": {m: [] for m in ALL_MONTHS},
            },
        )
        row["months"][when.month].append(
            {"id": str(w.pk), "number": w.number, "status": w.status, "date": when.isoformat()}
        )
    # Defect remediation first within a building, then the regulation by element
    return sorted(
        rows.values(),
        key=lambda r: (r["building_code"], r["kind"] != "reactive", r["element"], r["title"]),
    )
