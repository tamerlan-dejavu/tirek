"""Risk scoring aid (spec §9): factors → score → suggested R-level; the engineer decides."""

import pytest

from apps.audit.models import AuditAction, AuditEvent
from apps.defects.models import Defect
from apps.risks import methodology

from .conftest import client_for

pytestmark = pytest.mark.django_db


def _defect_in_review(world):
    r = client_for(world.field_a).post(
        "/api/v1/defects/",
        {
            "building": str(world.building.pk),
            "element": str(world.roof.pk),
            "defect_type": "Протечка кровли",
            "description": "Следы замачивания",
            "category": "leaks",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    Defect.objects.filter(pk=r.json()["id"]).update(status="in_review")
    return r.json()["id"]


def _assess(world, defect, category, **factors):
    return client_for(world.engineer_a).post(
        "/api/v1/risk-assessments/",
        {
            "defect": defect,
            "category": category,
            "hazard_description": "Замачивание перекрытия",
            "justification": "Осмотр",
            "recommended_actions": "Ремонт кровли",
            **factors,
        },
        format="json",
    )


def test_methodology_thresholds():
    assert methodology.suggest(methodology.score(5, 5, 5, 5)) == "R1"
    assert methodology.suggest(256) == "R1"
    assert methodology.suggest(255) == "R2"
    assert methodology.suggest(81) == "R2"
    assert methodology.suggest(80) == "R3"
    assert methodology.suggest(15) == "R4"
    assert methodology.suggest(1) == "R4"


def test_service_life_from_year_built():
    from datetime import date

    today = date(2026, 1, 1)
    assert methodology.service_life_level(2020, today) == 1
    assert methodology.service_life_level(1990, today) == 3
    assert methodology.service_life_level(1960, today) == 5
    assert methodology.service_life_level(None, today) is None


def test_methodology_endpoint_marks_preliminary(world):
    r = client_for(world.field_a).get("/api/v1/risk-assessments/methodology/")
    assert r.status_code == 200
    body = r.json()
    assert "требует утверждения" in body["status"]
    assert set(body["scales"]) == {"probability", "consequences", "condition", "service_life"}
    assert body["response"]["R1"]["action"] == "Требуется немедленная реакция"


def test_score_and_suggestion_stored(world):
    d = _defect_in_review(world)
    r = _assess(world, d, "R2", probability=4, consequences=3, condition=3, service_life=3)
    assert r.status_code == 201, r.content
    body = r.json()
    assert body["score"] == 108
    assert body["suggested_category"] == "R2"
    assert body["is_override"] is False


def test_factors_all_or_none(world):
    d = _defect_in_review(world)
    r = _assess(world, d, "R3", probability=3, consequences=3)
    assert r.status_code == 400
    # no factors at all is allowed: the engineer's judgement alone
    r = _assess(world, d, "R3")
    assert r.status_code == 201, r.content
    assert r.json()["score"] is None


def test_engineer_override_is_recorded(world):
    d = _defect_in_review(world)
    r = _assess(world, d, "R1", probability=2, consequences=5, condition=2, service_life=2)
    assert r.status_code == 201, r.content
    assert r.json()["suggested_category"] == "R3"
    assert r.json()["category"] == "R1"
    assert r.json()["is_override"] is True
    event = AuditEvent.objects.filter(action=AuditAction.RISK_ASSESSED).latest("created_at")
    assert event.changes["override"] is True
    assert event.changes["score"] == 40


def test_score_is_server_side(world):
    d = _defect_in_review(world)
    r = _assess(
        world,
        d,
        "R4",
        probability=1,
        consequences=1,
        condition=1,
        service_life=1,
        score=600,
        suggested_category="R1",
    )
    assert r.status_code == 201
    assert r.json()["score"] == 1
    assert r.json()["suggested_category"] == "R4"


def test_factor_out_of_range_rejected(world):
    d = _defect_in_review(world)
    r = _assess(world, d, "R2", probability=6, consequences=3, condition=3, service_life=3)
    assert r.status_code == 400
