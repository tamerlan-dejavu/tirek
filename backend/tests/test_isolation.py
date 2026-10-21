"""
Negative tests for organization isolation (ТЗ 9.2, AC-02, AC-14).
A foreign user must not read or change data through the API directly.
"""

import pytest

from apps.defects.models import Defect

from .conftest import client_for

pytestmark = pytest.mark.django_db


def test_foreign_provider_cannot_list_or_read_building(world):
    api = client_for(world.admin_b)
    assert api.get("/api/v1/buildings/").json()["count"] == 0
    assert api.get(f"/api/v1/buildings/{world.building.pk}/").status_code == 404


def test_foreign_provider_cannot_update_building(world):
    api = client_for(world.admin_b)
    r = api.patch(f"/api/v1/buildings/{world.building.pk}/", {"floors": 99}, format="json")
    assert r.status_code == 404
    world.building.refresh_from_db()
    assert world.building.floors is None


def test_foreign_provider_cannot_create_defect_in_building(world):
    api = client_for(world.admin_b)
    r = api.post(
        "/api/v1/defects/",
        {
            "building": str(world.building.pk),
            "element": str(world.roof.pk),
            "defect_type": "Протечка",
            "description": "x",
        },
        format="json",
    )
    assert r.status_code == 403
    assert not Defect.objects.exists()


def test_foreign_provider_cannot_grant_itself_access(world):
    api = client_for(world.admin_b)
    r = api.post(
        "/api/v1/building-links/",
        {
            "building": str(world.building.pk),
            "organization": str(world.org_b.pk),
            "function": "technical_support",
        },
        format="json",
    )
    assert r.status_code == 403


def test_unassigned_field_specialist_does_not_see_building(world):
    world.field_a.building_assignments.update(is_active=False)
    api = client_for(world.field_a)
    assert api.get("/api/v1/buildings/").json()["count"] == 0


def test_customer_does_not_see_unpublished_inspection(world):
    engineer = client_for(world.engineer_a)
    r = engineer.post(
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
    osi = client_for(world.osi_rep)
    assert osi.get("/api/v1/inspections/").json()["count"] == 0
    assert osi.get(f"/api/v1/inspections/{r.json()['id']}/").status_code == 404


def test_customer_cannot_change_engineering_data(world):
    osi = client_for(world.osi_rep)
    r = osi.patch(f"/api/v1/buildings/{world.building.pk}/", {"floors": 5}, format="json")
    assert r.status_code == 403


def test_audit_log_hidden_from_foreign_admin(world):
    client_for(world.admin_a).patch(
        f"/api/v1/buildings/{world.building.pk}/", {"floors": 9}, format="json"
    )
    assert client_for(world.admin_a).get("/api/v1/audit-events/").json()["count"] >= 1
    assert client_for(world.admin_b).get("/api/v1/audit-events/").json()["count"] == 0
