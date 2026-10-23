"""
End-to-end business cycle through the API (ТЗ 1.2, UC-02 … UC-09):
inspection → defect → review & risk → work order → publication → report → closure.
"""

from unittest import mock

import pytest

from apps.defects.models import Defect, DefectStatus
from apps.files.models import FileLink
from apps.workorders.models import WorkOrder

from .conftest import client_for

pytestmark = pytest.mark.django_db


@pytest.fixture
def inspection(world):
    r = client_for(world.engineer_a).post(
        "/api/v1/inspections/",
        {
            "building": str(world.building.pk),
            "provider_organization": str(world.org_a.pk),
            "template_version": str(world.version.pk),
            "assignee": str(world.field_a.pk),
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    return r.json()


def _fill_and_submit(world, inspection):
    field = client_for(world.field_a)
    r = field.post(
        "/api/v1/inspection-answers/",
        {"inspection": inspection["id"], "item": str(world.item.pk), "compliance": "fail"},
        format="json",
    )
    assert r.status_code == 201, r.content
    r = field.post(
        "/api/v1/defects/",
        {
            "building": str(world.building.pk),
            "element": str(world.roof.pk),
            "inspection": inspection["id"],
            "answer": r.json()["id"],
            "defect_type": "Протечка кровли",
            "description": "Следы протечки над кв. 36",
            "preliminary_severity": "R2",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    defect_id = r.json()["id"]
    assert r.json()["status"] == "detected"  # waits for the inspection to be submitted
    r = field.post(f"/api/v1/inspections/{inspection['id']}/submit/")
    assert r.status_code == 200, r.content
    # the hand-over to the engineer is part of the defect history
    events = field.get(f"/api/v1/defects/{defect_id}/events/").json()
    assert [e["to_status"] for e in events] == ["in_review"]
    return defect_id


def test_submit_requires_answers(world, inspection):
    r = client_for(world.field_a).post(f"/api/v1/inspections/{inspection['id']}/submit/")
    assert r.status_code == 400
    assert r.json()["error"]["detail"]["missing"][0]["code"] == "КР-01"


def test_engineer_returns_inspection_with_comment(world, inspection):  # AC-09
    _fill_and_submit(world, inspection)
    eng = client_for(world.engineer_a)
    assert (
        eng.post(f"/api/v1/inspections/{inspection['id']}/return/", {"comment": ""}).status_code
        == 400
    )
    r = eng.post(f"/api/v1/inspections/{inspection['id']}/return/", {"comment": "Добавьте фото"})
    assert r.status_code == 200
    assert r.json()["status"] == "returned"


def test_field_specialist_cannot_approve(world, inspection):
    _fill_and_submit(world, inspection)
    r = client_for(world.field_a).post(f"/api/v1/inspections/{inspection['id']}/approve/")
    assert r.status_code == 403


def test_unapproved_inspection_cannot_be_published_or_reported(world, inspection):  # AC-11
    eng = client_for(world.engineer_a)
    assert eng.post(f"/api/v1/inspections/{inspection['id']}/publish/").status_code == 400
    r = eng.post("/api/v1/reports/generate/", {"inspection": inspection["id"]}, format="json")
    assert r.status_code == 400


@mock.patch("apps.reports.services.generate_report.delay")
def test_full_cycle(delay, world, inspection, django_capture_on_commit_callbacks):
    defect_id = _fill_and_submit(world, inspection)
    eng = client_for(world.engineer_a)
    osi = client_for(world.osi_rep)

    # UC-05 / AC-10: risk confirmed with justification; R1 → urgent notice
    r = eng.post(
        "/api/v1/risk-assessments/",
        {
            "defect": defect_id,
            "category": "R1",
            "hazard_description": "Намокание электропроводки",
            "justification": "Протечка над ВРУ",
            "recommended_actions": "Локальный ремонт кровли",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    defect = Defect.objects.get(pk=defect_id)
    assert defect.status == DefectStatus.CONFIRMED
    assert defect.urgent_notices.exists()

    assert eng.post(f"/api/v1/inspections/{inspection['id']}/approve/").status_code == 200

    # UC-06 / AC-12: work order from the confirmed defect
    r = eng.post(
        "/api/v1/work-orders/",
        {
            "building": str(world.building.pk),
            "defect": defect_id,
            "title": "Ремонт кровли",
            "priority": "urgent",
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    wo_id = r.json()["id"]

    # UC-07: publish; ОСИ now sees the inspection and the defect
    assert eng.post(f"/api/v1/inspections/{inspection['id']}/publish/").status_code == 200
    assert osi.get("/api/v1/inspections/").json()["count"] == 1
    assert osi.get("/api/v1/defects/").json()["count"] == 1

    # UC-08: report requested from approved data
    with django_capture_on_commit_callbacks(execute=True):
        r = eng.post("/api/v1/reports/generate/", {"inspection": inspection["id"]}, format="json")
    assert r.status_code == 202
    assert delay.called

    # ТЗ 5.8: the engineer cannot agree on behalf of ОСИ
    assert (
        eng.post(f"/api/v1/work-orders/{wo_id}/transition/", {"status": "agreed"}).status_code
        == 403
    )
    for status in ("agreed", "scheduled", "in_progress"):
        r = osi.post(f"/api/v1/work-orders/{wo_id}/transition/", {"status": status})
        assert r.status_code == 200, (status, r.content)

    # Completion requires evidence
    assert (
        osi.post(f"/api/v1/work-orders/{wo_id}/transition/", {"status": "done"}).status_code == 400
    )
    wo = WorkOrder.objects.get(pk=wo_id)
    from django.contrib.contenttypes.models import ContentType

    from apps.files.models import StoredFile

    photo = StoredFile.objects.create(
        file="x",
        original_name="after.jpg",
        content_type="image/jpeg",
        size=1,
        sha256="0" * 64,
        building=world.building,
        uploaded_by=world.osi_rep,
    )
    FileLink.objects.create(
        file=photo,
        content_type=ContentType.objects.get_for_model(wo),
        object_id=str(wo.pk),
        created_by=world.osi_rep,
    )
    assert (
        osi.post(f"/api/v1/work-orders/{wo_id}/transition/", {"status": "done"}).status_code == 200
    )

    # UC-09: verification by the engineer closes the defect, history kept (AC-13)
    assert (
        eng.post(f"/api/v1/work-orders/{wo_id}/transition/", {"status": "verified"}).status_code
        == 200
    )
    defect.refresh_from_db()
    assert defect.status == DefectStatus.CLOSED
    assert defect.closure_basis
    events = eng.get(f"/api/v1/work-orders/{wo_id}/events/").json()
    assert [e["to_status"] for e in events] == [
        "agreed",
        "scheduled",
        "in_progress",
        "done",
        "verified",
    ]


def test_repeated_observation_keeps_history(world, inspection):  # AC-17
    defect_id = _fill_and_submit(world, inspection)
    field = client_for(world.field_a)
    for text in ("Пятно 0,5 м²", "Пятно 1,2 м²"):
        r = field.post(
            f"/api/v1/defects/{defect_id}/observations/",
            {"description": text, "trend": "worse"},
            format="json",
        )
        assert r.status_code == 201
    obs = field.get(f"/api/v1/defects/{defect_id}/observations/").json()
    assert [o["description"] for o in obs] == ["Пятно 0,5 м²", "Пятно 1,2 м²"]
