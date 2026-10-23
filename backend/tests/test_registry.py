"""Defect registry: categories reference, priority as an engineering decision, filters, stats."""

import pytest

from apps.defects.models import DefectCategory

from .conftest import client_for

pytestmark = pytest.mark.django_db


def _defect(api, world, **extra):
    body = {
        "building": str(world.building.pk),
        "element": str(world.roof.pk),
        "defect_type": "Трещина в парапете",
        "description": "Трещина шириной 2 мм",
        "category": "cracks",
        **extra,
    }
    return api.post("/api/v1/defects/", body, format="json")


def test_initial_categories_and_admin_extends_them(world):
    codes = {c["code"] for c in client_for(world.field_a).get("/api/v1/defect-categories/").json()}
    assert {"cracks", "leaks", "corrosion", "other"} <= codes
    new = {"code": "biological", "name": "Биологические повреждения", "sort_order": 85}
    assert (
        client_for(world.engineer_a)
        .post("/api/v1/defect-categories/", new, format="json")
        .status_code
        == 403
    )
    assert (
        client_for(world.admin_a).post("/api/v1/defect-categories/", new, format="json").status_code
        == 201
    )
    r = client_for(world.admin_a).patch(
        "/api/v1/defect-categories/biological/", {"is_active": False}, format="json"
    )
    assert r.status_code == 200
    assert not DefectCategory.objects.get(code="biological").is_active  # deactivated, not deleted


def test_field_specialist_sets_category_not_priority(world):
    api = client_for(world.field_a)
    assert _defect(api, world, priority="urgent").status_code == 403
    r = _defect(api, world)
    assert r.status_code == 201, r.content
    assert r.json()["category_name"] == "Трещины и раскрытие швов"
    assert r.json()["priority"] == ""


def test_assessment_suggests_priority_engineer_can_change(world):
    d = _defect(client_for(world.field_a), world).json()
    from apps.defects.models import Defect

    Defect.objects.filter(pk=d["id"]).update(status="in_review")
    eng = client_for(world.engineer_a)
    r = eng.post(
        "/api/v1/risk-assessments/",
        {
            "defect": d["id"],
            "category": "R1",
            "hazard_description": "Обрушение парапета",
            "justification": "Сквозная трещина",
            "recommended_actions": "Ограждение, ремонт",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    assert eng.get(f"/api/v1/defects/{d['id']}/").json()["priority"] == "urgent"
    # the engineer may re-prioritise even after confirmation
    r = eng.patch(f"/api/v1/defects/{d['id']}/", {"priority": "high"}, format="json")
    assert r.status_code == 200, r.content
    assert r.json()["priority"] == "high"
    # the field specialist may not
    r = client_for(world.field_a).patch(
        f"/api/v1/defects/{d['id']}/", {"priority": "low"}, format="json"
    )
    assert r.status_code == 403


def test_registry_filters_and_category_statistics(world):
    api = client_for(world.field_a)
    _defect(api, world)
    _defect(api, world, category="leaks", defect_type="Протечка")
    eng = client_for(world.engineer_a)
    assert eng.get("/api/v1/defects/?category=leaks").json()["count"] == 1
    stats = eng.get("/api/v1/analytics/breakdown/").json()
    assert stats["open_by_category"] == {"Трещины и раскрытие швов": 1, "Протечки и замачивание": 1}


def test_standalone_defect_goes_to_review_and_back_after_clarification(world):
    """A defect registered outside an inspection must reach the engineer (no dead end)."""
    from apps.defects.models import DefectEvent

    d = _defect(client_for(world.field_a), world).json()
    assert d["status"] == "in_review"
    eng = client_for(world.engineer_a)
    url = f"/api/v1/defects/{d['id']}/"
    r = eng.post(url + "request-clarification/", {"comment": "Нужна ширина трещины"})
    assert r.json()["status"] == "needs_clarification"
    field = client_for(world.field_a)
    assert field.post(url + "resubmit/", {"comment": ""}).status_code == 400
    r = field.post(url + "resubmit/", {"comment": "Ширина 2 мм, длина 40 см"})
    assert r.status_code == 200 and r.json()["status"] == "in_review"
    history = list(
        DefectEvent.objects.filter(defect_id=d["id"])
        .order_by("created_at")
        .values_list("to_status", flat=True)
    )
    assert history == ["in_review", "needs_clarification", "in_review"]
