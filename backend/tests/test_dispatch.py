"""Dispatcher module (spec §11): sources, priority, 7-status workflow, result photo."""

import io

import pytest
from PIL import Image

from apps.service_requests.models import ServiceRequestEvent

from .conftest import client_for
from .test_roles import _request, roles  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


def _upload(user, building, req_id, kind):
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), "gray").save(buf, format="PNG")
    buf.seek(0)
    buf.name = "result.png"
    return client_for(user).post(
        "/api/v1/files/upload/",
        {
            "file": buf,
            "building": str(building.pk),
            "kind": kind,
            "target_type": "service_request",
            "target_id": req_id,
        },
        format="multipart",
    )


def _url(req, action):
    return f"/api/v1/service-requests/{req['id']}/{action}/"


def test_source_follows_who_registered(roles):  # noqa: F811
    assert _request(client_for(roles.resident), roles.building).json()["source"] == "resident"
    assert _request(client_for(roles.dispatcher), roles.building).json()["source"] == "dispatcher"
    by_field = _request(client_for(roles.field_a), roles.building)
    assert by_field.status_code == 201, by_field.content
    assert by_field.json()["source"] == "specialist"
    assert by_field.json()["author"] is None
    assert _request(client_for(roles.engineer_a), roles.building).json()["source"] == "engineer"
    assert _request(client_for(roles.osi_rep), roles.building).json()["source"] == "osi"
    assert _request(client_for(roles.admin_b), roles.building).status_code == 403


def test_emergency_defaults_to_urgent_priority_dispatcher_changes_it(roles):  # noqa: F811
    req = _request(client_for(roles.resident), roles.building, is_emergency=True, priority="low")
    assert req.json()["priority"] == "urgent"  # resident cannot set priority
    normal = _request(client_for(roles.resident), roles.building).json()
    assert normal["priority"] == "normal"
    r = client_for(roles.resident).post(_url(normal, "prioritize"), {"priority": "high"})
    assert r.status_code == 403
    r = client_for(roles.dispatcher).post(_url(normal, "prioritize"), {"priority": "high"})
    assert r.status_code == 200 and r.json()["priority"] == "high"


def test_full_workflow_with_result_photo(roles):  # noqa: F811
    req = _request(client_for(roles.resident), roles.building).json()
    disp = client_for(roles.dispatcher)
    executor = client_for(roles.field_a)

    assert disp.post(_url(req, "accept")).json()["status"] == "accepted"
    r = disp.post(
        _url(req, "assign"),
        {"assignee": str(roles.field_a.pk), "due_date": "2030-01-10", "priority": "high"},
    )
    assert r.json()["status"] == "assigned" and r.json()["priority"] == "high"

    # another specialist cannot start someone else's task
    assert client_for(roles.engineer_a).post(_url(req, "start")).status_code == 403
    assert executor.post(_url(req, "start")).json()["status"] == "in_progress"

    # «выполнена» requires a description and a result photo
    assert executor.post(_url(req, "complete"), {"text": ""}).status_code == 400
    r = executor.post(_url(req, "complete"), {"text": "Заменена прокладка"})
    assert r.status_code == 400 and "files" in r.json()["error"]["detail"]
    # a resident's photo of the problem does not count as a result photo
    assert _upload(roles.resident, roles.building, req["id"], "photo").status_code == 201
    assert _upload(roles.resident, roles.building, req["id"], "repair_photo").status_code == 403
    assert executor.post(_url(req, "complete"), {"text": "Заменена прокладка"}).status_code == 400
    assert _upload(roles.field_a, roles.building, req["id"], "repair_photo").status_code == 201
    r = executor.post(_url(req, "complete"), {"text": "Заменена прокладка"})
    assert r.status_code == 200, r.content
    assert r.json()["status"] == "done" and r.json()["has_result_photo"] is True

    # the executor cannot verify their own work; the engineer can
    assert executor.post(_url(req, "verify")).status_code == 403
    r = client_for(roles.engineer_a).post(_url(req, "verify"), {"text": "Проверено"})
    assert r.json()["status"] == "verified"

    # only the dispatcher closes
    assert client_for(roles.engineer_a).post(_url(req, "close")).status_code == 403
    assert disp.post(_url(req, "close")).json()["status"] == "closed"

    statuses = list(
        ServiceRequestEvent.objects.filter(request_id=req["id"])
        .order_by("created_at")
        .values_list("to_status", flat=True)
    )
    assert statuses == ["accepted", "assigned", "in_progress", "done", "verified", "closed"]


def test_failed_check_returns_to_work(roles):  # noqa: F811
    req = _request(client_for(roles.resident), roles.building).json()
    disp = client_for(roles.dispatcher)
    disp.post(_url(req, "assign"), {"assignee": str(roles.field_a.pk)})
    executor = client_for(roles.field_a)
    executor.post(_url(req, "start"))
    _upload(roles.field_a, roles.building, req["id"], "repair_photo")
    executor.post(_url(req, "complete"), {"text": "Готово"})
    assert disp.post(_url(req, "return"), {"text": ""}).status_code == 400
    r = disp.post(_url(req, "return"), {"text": "Течь осталась"})
    assert r.json()["status"] == "in_progress"


def test_transitions_cannot_skip_steps(roles):  # noqa: F811
    req = _request(client_for(roles.resident), roles.building).json()
    disp = client_for(roles.dispatcher)
    assert disp.post(_url(req, "start")).status_code == 400  # not assigned yet
    assert disp.post(_url(req, "close")).status_code == 400
    assert disp.post(_url(req, "verify")).status_code == 400


def test_reassignment_keeps_status_and_is_recorded(roles):  # noqa: F811
    req = _request(client_for(roles.resident), roles.building).json()
    disp = client_for(roles.dispatcher)
    disp.post(_url(req, "assign"), {"assignee": str(roles.field_a.pk)})
    r = disp.post(_url(req, "assign"), {"assignee": str(roles.engineer_a.pk)})
    assert r.json()["status"] == "assigned"
    assert r.json()["assignee"] == str(roles.engineer_a.pk)
    assert ServiceRequestEvent.objects.filter(
        request_id=req["id"], comment__startswith="Переназначена"
    ).exists()
