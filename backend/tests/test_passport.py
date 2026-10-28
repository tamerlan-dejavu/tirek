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
    for t in ElementType.objects.filter(code__in=ElementType.codes_for("residential")).exclude(
        group="location"
    ):
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


COMMERCIAL_ONLY = {"escalators", "hvac", "smoke_control", "access_control", "public_areas"}


def test_commercial_building_gets_its_own_classifier(world):
    """ТЗ 5.3–5.4, AC-21: the type defines the passport fields and the element classifier."""
    api = client_for(world.admin_a)
    r = api.post(
        "/api/v1/buildings/",
        {
            "internal_code": "T-BC",
            "address": "пр. Деловой, 5",
            "building_type": "business_center",
            "leasable_area_m2": "12500.00",
            "premises": 140,
            "provider_organization": str(world.org_a.pk),
        },
        format="json",
    )
    assert r.status_code == 201, r.content
    body = r.json()
    assert body["building_type_label"] == "Бизнес-центр"
    assert "leasable_area_m2" in body["general_fields"]
    assert "apartments" not in body["general_fields"]
    codes = set(_entries(api, Building.objects.get(internal_code="T-BC")))
    assert COMMERCIAL_ONLY <= codes
    assert "tech_premises" not in codes  # mall and hotel only
    residential = set(_entries(api, world.building))
    assert not (COMMERCIAL_ONLY & residential)
    # classifier endpoint follows the type
    types = {t["code"] for t in api.get("/api/v1/element-types/?building_type=residential").json()}
    assert "entrance" in types and "premise" not in types


def test_type_change_adds_lines_and_keeps_history(world):
    api = client_for(world.admin_a)
    ensure_passport(world.building)
    before = world.building.passport_entries.count()
    r = api.patch(
        f"/api/v1/buildings/{world.building.pk}/", {"building_type": "hotel"}, format="json"
    )
    assert r.status_code == 200, r.content
    codes = set(_entries(api, world.building))
    assert {"tech_premises", "hvac"} <= codes
    # lines are only added, never deleted (history)
    assert world.building.passport_entries.count() > before
    hotel_back = api.patch(
        f"/api/v1/buildings/{world.building.pk}/", {"building_type": "residential"}, format="json"
    )
    assert hotel_back.status_code == 200
    assert "hvac" not in set(_entries(api, world.building))  # hidden for a residential building
    assert world.building.passport_entries.filter(element_type="hvac").exists()


def test_inspection_only_with_template_of_building_type(world):
    """ТЗ 5.5, AC-22: templates of residential and commercial buildings are not mixed."""
    from apps.checklists.models import ChecklistTemplate, ChecklistTemplateVersion

    bc = Building.objects.create(
        internal_code="T-BC2", address="пр. Деловой, 7", building_type="business_center"
    )
    from apps.organizations.models import BuildingOrganizationLink, LinkFunction

    BuildingOrganizationLink.objects.create(
        building=bc, organization=world.org_a, function=LinkFunction.TECHNICAL_SUPPORT
    )
    api = client_for(world.engineer_a)

    def create(version):
        return api.post(
            "/api/v1/inspections/",
            {
                "building": str(bc.pk),
                "provider_organization": str(world.org_a.pk),
                "template_version": str(version.pk),
                "assignee": str(world.field_a.pk),
            },
            format="json",
        )

    r = create(world.version)  # residential template
    assert r.status_code == 400
    assert "template_version" in str(r.json())
    tpl = ChecklistTemplate.objects.create(
        organization=world.org_a, name="Осмотр БЦ", building_type="business_center"
    )
    v = ChecklistTemplateVersion.objects.create(
        template=tpl, number=1, status=ChecklistTemplateVersion.Status.PUBLISHED
    )
    assert create(v).status_code == 201
    listed = api.get("/api/v1/checklist-templates/?building_type=business_center").json()
    names = [t["name"] for t in (listed.get("results", listed))]
    assert names == ["Осмотр БЦ"]
