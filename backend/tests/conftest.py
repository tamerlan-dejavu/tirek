from types import SimpleNamespace

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.buildings.models import Building, BuildingElement
from apps.checklists.models import (
    AnswerType,
    ChecklistItem,
    ChecklistTemplate,
    ChecklistTemplateVersion,
)
from apps.organizations.models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    LinkFunction,
    Organization,
    OrganizationMembership,
    OrganizationType,
    Role,
)


def _user(email, org, role):
    user = User.objects.create_user(email=email, password="x-test-password-1")
    OrganizationMembership.objects.create(user=user, organization=org, role=role)
    return user


@pytest.fixture
def world(db):
    """
    Two independent providers (A, B), one ОСИ linked to A's building.
    Mirrors AC-01: independent organizations and users with different rights.
    """
    org_a = Organization.objects.create(type=OrganizationType.PROVIDER, name="Provider A")
    org_b = Organization.objects.create(type=OrganizationType.PROVIDER, name="Provider B")
    osi = Organization.objects.create(type=OrganizationType.CUSTOMER, name="ОСИ A")

    admin_a = _user("admin@a.test", org_a, Role.PROVIDER_ADMIN)
    field_a = _user("field@a.test", org_a, Role.FIELD_SPECIALIST)
    engineer_a = _user("engineer@a.test", org_a, Role.REVIEWING_ENGINEER)
    admin_b = _user("admin@b.test", org_b, Role.PROVIDER_ADMIN)
    osi_rep = _user("osi@a.test", osi, Role.OSI_REPRESENTATIVE)

    building = Building.objects.create(internal_code="T-1", address="ул. Тестовая, 1")
    BuildingOrganizationLink.objects.create(
        building=building, organization=org_a, function=LinkFunction.TECHNICAL_SUPPORT
    )
    BuildingOrganizationLink.objects.create(
        building=building, organization=osi, function=LinkFunction.CUSTOMER
    )
    BuildingAssignment.objects.create(building=building, user=field_a)
    roof = BuildingElement.objects.create(building=building, element_type_id="roof", name="Кровля")

    template = ChecklistTemplate.objects.create(organization=org_a, name="Осмотр")
    version = ChecklistTemplateVersion.objects.create(
        template=template, number=1, status=ChecklistTemplateVersion.Status.PUBLISHED
    )
    item = ChecklistItem.objects.create(
        version=version,
        element_type_id="roof",
        code="КР-01",
        text="Кровля",
        answer_type=AnswerType.COMPLIANCE,
        photo_required_on_fail=False,
    )
    return SimpleNamespace(**locals())


def client_for(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client
