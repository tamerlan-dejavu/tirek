"""Resident, dispatcher and ПТО roles; demo login guard."""

import io

import pytest
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.buildings.models import Building
from apps.defects.models import DefectStatus
from apps.notifications.models import Notification
from apps.organizations.models import (
    BuildingOrganizationLink,
    LinkFunction,
    OrganizationMembership,
    Role,
)
from apps.service_requests.models import Poll, PollOption, RequestStatus
from apps.workorders.models import WorkOrder, WorkOrderStatus

from .conftest import client_for

pytestmark = pytest.mark.django_db


def _member(email, org, role):
    user = User.objects.create_user(email=email, password="x-test-password-1")
    OrganizationMembership.objects.create(user=user, organization=org, role=role)
    return user


@pytest.fixture
def roles(world):
    world.resident = _member("resident@a.test", world.osi, Role.RESIDENT)
    world.dispatcher = _member("dispatcher@a.test", world.org_a, Role.DISPATCHER)
    world.pto = _member("pto@a.test", world.org_a, Role.PRODUCTION_PLANNER)
    world.other_building = Building.objects.create(internal_code="T-2", address="ул. Чужая, 2")
    BuildingOrganizationLink.objects.create(
        building=world.other_building,
        organization=world.org_b,
        function=LinkFunction.TECHNICAL_SUPPORT,
    )
    return world


def _request(api, building, **extra):
    body = {
        "building": str(building.pk),
        "category": "leak",
        "description": "Капает с потолка",
        **extra,
    }
    return api.post("/api/v1/service-requests/", body, format="json")


def test_resident_sees_no_engineering_data(roles):
    api = client_for(roles.resident)
    assert api.get("/api/v1/buildings/").json()["count"] == 0
    assert api.get("/api/v1/defects/").json()["count"] == 0
    assert api.get("/api/v1/inspections/").json()["count"] == 0
    assert api.get("/api/v1/risk-assessments/").json()["count"] == 0


def test_resident_files_request_only_for_own_building(roles):
    api = client_for(roles.resident)
    r = _request(api, roles.building)
    assert r.status_code == 201, r.content
    assert r.json()["status"] == "new"
    assert _request(api, roles.other_building).status_code == 403


def test_resident_sees_only_own_requests(roles):
    neighbour = _member("n@a.test", roles.osi, Role.RESIDENT)
    _request(client_for(roles.resident), roles.building)
    _request(client_for(neighbour), roles.building)
    assert client_for(roles.resident).get("/api/v1/service-requests/").json()["count"] == 1
    # dispatcher of the serving provider sees both
    assert client_for(roles.dispatcher).get("/api/v1/service-requests/").json()["count"] == 2


def test_resident_cannot_set_status_fields(roles):
    r = _request(
        client_for(roles.resident),
        roles.building,
        status="resolved",
        assignee=str(roles.field_a.pk),
    )
    assert r.json()["status"] == "new"
    assert r.json()["assignee"] is None


def test_dispatcher_assigns_and_resident_is_notified(roles):
    req = _request(client_for(roles.resident), roles.building).json()
    disp = client_for(roles.dispatcher)
    assert (
        client_for(roles.resident).post(f"/api/v1/service-requests/{req['id']}/accept/").status_code
        == 403
    )
    r = disp.post(
        f"/api/v1/service-requests/{req['id']}/assign/",
        {"assignee": str(roles.field_a.pk), "due_date": "2030-01-10"},
        format="json",
    )
    assert r.status_code == 200, r.content
    assert r.json()["status"] == RequestStatus.IN_PROGRESS
    assert Notification.objects.filter(recipient=roles.resident).count() == 2  # accepted, in work
    events = disp.get(f"/api/v1/service-requests/{req['id']}/events/").json()
    assert [e["to_status"] for e in events] == ["accepted", "in_progress"]


def test_assignee_must_serve_the_building(roles):
    req = _request(client_for(roles.resident), roles.building).json()
    r = client_for(roles.dispatcher).post(
        f"/api/v1/service-requests/{req['id']}/assign/",
        {"assignee": str(roles.admin_b.pk)},
        format="json",
    )
    assert r.status_code == 400


def test_emergency_confirmation_alerts_staff(roles):
    req = _request(client_for(roles.resident), roles.building, is_emergency=True).json()
    r = client_for(roles.dispatcher).post(
        f"/api/v1/service-requests/{req['id']}/confirm-emergency/"
    )
    assert r.status_code == 200
    assert Notification.objects.filter(
        recipient=roles.engineer_a, kind="emergency_request"
    ).exists()
    assert not Notification.objects.filter(recipient=roles.admin_b).exists()


def test_request_becomes_defect_for_engineering_review(roles):
    req = _request(client_for(roles.resident), roles.building, entrance=2, floor=9).json()
    r = client_for(roles.dispatcher).post(
        f"/api/v1/service-requests/{req['id']}/create-defect/",
        {"element": str(roles.roof.pk), "defect_type": "Протечка кровли"},
        format="json",
    )
    assert r.status_code == 201, r.content
    defect = client_for(roles.engineer_a).get(f"/api/v1/defects/{r.json()['defect']}/").json()
    assert defect["status"] == DefectStatus.DETECTED
    assert "подъезд 2" in defect["location"]


def test_pto_schedules_but_cannot_agree_for_osi(roles):
    wo = WorkOrder.objects.create(
        number="WO-T-1",
        building=roles.building,
        title="Ремонт",
        basis="тест",
        status=WorkOrderStatus.PROPOSED,
    )
    pto = client_for(roles.pto)
    assert (
        pto.post(f"/api/v1/work-orders/{wo.pk}/transition/", {"status": "agreed"}).status_code
        == 403
    )
    WorkOrder.objects.filter(pk=wo.pk).update(status=WorkOrderStatus.AGREED)
    r = pto.post(f"/api/v1/work-orders/{wo.pk}/transition/", {"status": "scheduled"})
    assert r.status_code == 200, r.content
    r = pto.patch(
        f"/api/v1/work-orders/{wo.pk}/",
        {"planned_date": "2030-05-01", "materials": "Мастика"},
        format="json",
    )
    assert r.status_code == 200, r.content


def test_poll_one_vote_per_resident(roles):
    poll = Poll.objects.create(building=roles.building, question="Когда?")
    opt = PollOption.objects.create(poll=poll, text="В мае")
    api = client_for(roles.resident)
    assert api.post(f"/api/v1/polls/{poll.pk}/vote/", {"option": opt.pk}).status_code == 200
    assert api.post(f"/api/v1/polls/{poll.pk}/vote/", {"option": opt.pk}).status_code == 400
    # staff are not residents of the building
    assert (
        client_for(roles.engineer_a)
        .post(f"/api/v1/polls/{poll.pk}/vote/", {"option": opt.pk})
        .status_code
        == 403
    )


def test_resident_can_attach_files_only_to_own_request(roles):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "red").save(buf, format="PNG")
    api = client_for(roles.resident)

    def upload(**target):
        buf.seek(0)
        f = io.BytesIO(buf.getvalue())
        f.name = "leak.png"
        return api.post(
            "/api/v1/files/upload/",
            {"file": f, "building": str(roles.building.pk), **target},
            format="multipart",
        )

    assert upload().status_code == 403  # no target
    req = _request(api, roles.building).json()
    r = upload(target_type="service_request", target_id=req["id"])
    assert r.status_code == 201, r.content
    assert (
        api.get(f"/api/v1/files/?target_type=service_request&target_id={req['id']}").json()["count"]
        == 1
    )


def test_resident_overview_shows_only_agreed_works(roles):
    WorkOrder.objects.create(number="WO-T-2", building=roles.building, title="Скрыто", basis="x")
    WorkOrder.objects.create(
        number="WO-T-3",
        building=roles.building,
        title="Видно",
        basis="x",
        status=WorkOrderStatus.SCHEDULED,
    )
    rows = client_for(roles.resident).get("/api/v1/resident/overview/").json()
    assert [w["title"] for w in rows[0]["works"]] == ["Видно"]


def test_demo_login_disabled_by_default(roles):
    api = APIClient()
    assert api.get("/api/v1/auth/demo/").json() == {"enabled": False, "accounts": []}
    assert api.post("/api/v1/auth/demo/login/", {"key": "engineer"}).status_code == 404


def test_demo_login_only_into_registry_accounts(roles, settings):
    settings.DEMO_MODE = True
    User.objects.create_user(email="dispatcher@provider.local", password="x-test-password-1")
    api = APIClient()
    listed = [a["key"] for a in api.get("/api/v1/auth/demo/").json()["accounts"]]
    assert listed == ["dispatcher"]  # only seeded accounts are offered
    assert api.post("/api/v1/auth/demo/login/", {"key": "superuser"}).status_code == 400
    r = api.post("/api/v1/auth/demo/login/", {"key": "dispatcher"})
    assert r.status_code == 200
    assert r.json()["home"] == "/requests"
    assert api.get("/api/v1/auth/me/").json()["email"] == "dispatcher@provider.local"
