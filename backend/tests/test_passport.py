"""Digital passport: full structure, explicit «неизвестно» / «нет в доме», role rules."""

import pytest

from apps.buildings.models import Building, ElementType
from apps.buildings.services import ensure_passport
from apps.defects.models import Defect

from .conftest import client_for

pytestmark = pytest.mark.django_db

STRUCTURAL = {"foundation", "walls", "columns", "beams", "slabs", "balconies", "facade", "roof"}
ENGINEERING = {
    "electrical",
    "water",
    "sewerage",
    "heating",
    "heat_point",
    "ventilation",
    "gas",
    "fire_safety",
    "low_current",
}
OPERATIONAL = {"elevators", "basement", "attic", "parking", "territory"}


def _entries(api, building):
    return {
        e["element_type"]: e
        for e in api.get(f"/api/v1/passport-entries/?building={building.pk}").json()
    }


def test_classifier_matches_passport_structure(db):
    by_group = {}
    for t in ElementType.objects.exclude(group="location"):
        by_group.setdefault(t.group, set()).add(t.code)
    assert by_group == {
        "structural": STRUCTURAL,
        "engineering": ENGINEERING,
        "operational": OPERATIONAL,
    }
    assert ElementType.objects.get(code="basement").name == "Подвальные помещения"
    assert ElementType.objects.get(code="attic").name == "Чердак"


def test_new_building_gets_full_passport(world):
    r = client_for(world.admin_a).post(
        "/api/v1/buildings/",
        {
            "internal_code": "T-NEW",
            "address": "ул. Новая, 1",
            "provider_organization": str(world.org_a.pk),
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    entries = _entries(client_for(world.admin_a), Building.objects.get(internal_code="T-NEW"))
    assert set(entries) == STRUCTURAL | ENGINEERING | OPERATIONAL
    assert {e["presence"] for e in entries.values()} == {"unknown"}  # nothing is invented


def test_absent_is_known_unknown_is_not(world):
    ensure_passport(world.building)
    api = client_for(world.engineer_a)
    before = api.get(f"/api/v1/buildings/{world.building.pk}/").json()["completeness"]
    gas = _entries(api, world.building)["gas"]
    r = api.patch(
        f"/api/v1/passport-entries/{gas['id']}/",
        {"presence": "absent", "source": "осмотр"},
        format="json",
    )
    assert r.status_code == 200, r.content
    after = api.get(f"/api/v1/buildings/{world.building.pk}/").json()["completeness"]
    assert after > before


def test_quantity_only_when_present(world):
    ensure_passport(world.building)
    api = client_for(world.engineer_a)
    lift = _entries(api, world.building)["elevators"]
    bad = api.patch(
        f"/api/v1/passport-entries/{lift['id']}/",
        {"presence": "absent", "quantity": 2},
        format="json",
    )
    assert bad.status_code == 400
    ok = api.patch(
        f"/api/v1/passport-entries/{lift['id']}/",
        {"presence": "present", "quantity": 2},
        format="json",
    )
    assert ok.status_code == 200
    assert ok.json()["updated_by_name"]


def test_field_specialist_records_parameters_osi_cannot(world):
    ensure_passport(world.building)
    entry = _entries(client_for(world.engineer_a), world.building)["roof"]
    body = {"presence": "present", "characteristics": "Рулонная, 2 слоя"}
    assert (
        client_for(world.field_a)
        .patch(f"/api/v1/passport-entries/{entry['id']}/", body, format="json")
        .status_code
        == 200
    )
    assert (
        client_for(world.osi_rep)
        .patch(f"/api/v1/passport-entries/{entry['id']}/", body, format="json")
        .status_code
        == 403
    )
    assert (
        client_for(world.admin_b)
        .get(f"/api/v1/passport-entries/?building={world.building.pk}")
        .json()
        == []
    )


def test_entry_counts_defects_of_that_element(world):
    ensure_passport(world.building)
    Defect.objects.create(
        number="DEF-T-1",
        building=world.building,
        element=world.roof,
        defect_type="Протечка",
        description="x",
    )
    roof = _entries(client_for(world.engineer_a), world.building)["roof"]
    assert roof["elements_count"] == 1
    assert roof["open_defects"] == 1
