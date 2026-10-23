"""Preliminary maintenance plan (spec §10): from defects and the passport-based regulation."""

from datetime import date

import pytest

from apps.buildings.models import BuildingPassportEntry, Presence
from apps.buildings.services import ensure_passport
from apps.defects.models import Defect
from apps.workorders import planning
from apps.workorders.models import MaintenanceRule, WorkKind, WorkOrder

from .conftest import client_for

pytestmark = pytest.mark.django_db


@pytest.fixture
def house(world):
    ensure_passport(world.building)
    entries = BuildingPassportEntry.objects.filter(building=world.building)
    entries.filter(element_type_id="roof").update(presence=Presence.PRESENT)
    entries.filter(element_type_id="elevators").update(presence=Presence.ABSENT)
    return world


def _confirmed_defect(world, category="R2"):
    api = client_for(world.field_a)
    d = api.post(
        "/api/v1/defects/",
        {
            "building": str(world.building.pk),
            "element": str(world.roof.pk),
            "defect_type": "Протечка кровли",
            "description": "Замачивание",
            "category": "leaks",
        },
        format="json",
    ).json()
    Defect.objects.filter(pk=d["id"]).update(status="in_review")
    r = client_for(world.engineer_a).post(
        "/api/v1/risk-assessments/",
        {
            "defect": d["id"],
            "category": category,
            "hazard_description": "Замачивание",
            "justification": "Осмотр",
            "recommended_actions": "Ремонт кровли",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    return d["id"]


def test_rule_occurrences_respect_start_month():
    rule = MaintenanceRule.objects.get(title__startswith="Осмотр кровли")
    assert planning.occurrences(rule, 2026, date(2026, 1, 10)) == [
        date(2026, 4, 15),
        date(2026, 10, 15),
    ]
    assert planning.occurrences(rule, 2026, date(2026, 6, 1)) == [date(2026, 10, 15)]


def test_plan_from_defects_and_passport(house):
    world = house
    defect = _confirmed_defect(world, "R2")
    gen = planning.generate(world.building, world.engineer_a, 2026, today=date(2026, 1, 10))
    assert gen["reactive"] == 1

    reactive = WorkOrder.objects.get(defect_id=defect)
    assert reactive.kind == WorkKind.REACTIVE
    assert reactive.priority == "high"  # from the defect (R2)
    assert reactive.recommended_date == date(2026, 1, 24)  # R2 → 14 days
    assert reactive.status == "proposed"

    preventive = WorkOrder.objects.filter(building=world.building, kind=WorkKind.PREVENTIVE)
    titles = set(preventive.values_list("title", flat=True))
    assert any(t.startswith("Осмотр кровли") for t in titles)
    assert not any("лифт" in t for t in titles)  # absent in passport
    assert not any("Фасад" in t or "фасада" in t for t in titles)  # unknown: not planned
    assert preventive.filter(element=world.roof).exists()
    assert gen["preventive"] == preventive.count() == 4  # 2 roof rules × 2 times a year


def test_plan_is_idempotent(house):
    world = house
    _confirmed_defect(world)
    planning.generate(world.building, world.engineer_a, 2026, today=date(2026, 1, 10))
    again = planning.generate(world.building, world.engineer_a, 2026, today=date(2026, 1, 10))
    assert again["reactive"] == again["preventive"] == 0


def test_generate_plan_endpoint_rights(house):
    world = house
    body = {"building": str(world.building.pk), "year": 2026}
    url = "/api/v1/work-orders/generate-plan/"
    assert client_for(world.field_a).post(url, body, format="json").status_code == 403
    assert client_for(world.osi_rep).post(url, body, format="json").status_code == 403
    assert client_for(world.admin_b).post(url, body, format="json").status_code == 404
    r = client_for(world.engineer_a).post(url, body, format="json")
    assert r.status_code == 201, r.content


def test_annual_grid(house):
    world = house
    planning.generate(world.building, world.engineer_a, 2026, today=date(2026, 1, 10))
    r = client_for(world.osi_rep).get(
        f"/api/v1/work-orders/annual-plan/?year=2026&building={world.building.pk}"
    )
    assert r.status_code == 200
    rows = r.json()["rows"]
    roof = next(row for row in rows if row["title"].startswith("Осмотр кровли"))
    assert len(roof["months"]["4"]) == 1 and len(roof["months"]["10"]) == 1
    assert roof["months"]["1"] == []
    assert roof["periodicity"] == "semiannual"
    other = client_for(world.admin_b).get("/api/v1/work-orders/annual-plan/?year=2026").json()
    assert other["rows"] == []


def test_maintenance_rules_reference(world):
    rules = client_for(world.engineer_a).get("/api/v1/maintenance-rules/").json()
    assert len(rules) >= 10
    assert all("утверждения" in r["note"] for r in rules)
    assert client_for(world.osi_rep).get("/api/v1/maintenance-rules/").json() == []
    rid = rules[0]["id"]
    url = f"/api/v1/maintenance-rules/{rid}/"
    body = {"months": [3, 9]}
    assert client_for(world.engineer_a).patch(url, body, format="json").status_code == 403
    assert client_for(world.admin_a).patch(url, body, format="json").status_code == 200


def test_numbers_skip_gaps(world):
    from django.utils import timezone

    from apps.workorders.services import next_number

    year = timezone.now().year
    WorkOrder.objects.create(
        number=f"WO-{year}-0006", building=world.building, title="x", basis="x"
    )
    assert next_number() == f"WO-{year}-0007"
