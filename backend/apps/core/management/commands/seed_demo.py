"""
Demo data for local development: two independent providers, one ОСИ, one building,
a published checklist. Never run against production.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.buildings.models import Building, BuildingElement, ElementType, StructuralScheme
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

PASSWORD = "tirek-demo-2026"  # noqa: S105 — local demo data only, guarded by DEBUG

USERS = [
    ("admin@provider.local", "Администратор поставщика", Role.PROVIDER_ADMIN),
    ("field@provider.local", "Полевой специалист", Role.FIELD_SPECIALIST),
    ("engineer@provider.local", "Проверяющий инженер", Role.REVIEWING_ENGINEER),
]

ITEMS = [
    ("roof", "КР-01", "Состояние кровельного покрытия", AnswerType.COMPLIANCE, ""),
    ("roof", "КР-02", "Площадь участков с протечками", AnswerType.NUMBER, "м²"),
    ("facade", "ФС-01", "Трещины в наружных стенах и швах", AnswerType.COMPLIANCE, ""),
    ("basement", "ПД-01", "Подтопление подвала", AnswerType.COMPLIANCE, ""),
    ("heating", "ОТ-01", "Состояние изоляции трубопроводов", AnswerType.COMPLIANCE, ""),
    ("electrical", "ЭЛ-01", "Состояние ВРУ", AnswerType.TEXT, ""),
]


class Command(BaseCommand):
    help = "Create demo organizations, users, a building and a published checklist."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo is only allowed with DEBUG=true")

        provider, _ = Organization.objects.get_or_create(
            name="Инженерный центр (демо)", defaults={"type": OrganizationType.PROVIDER}
        )
        other, _ = Organization.objects.get_or_create(
            name="Другой поставщик (демо)", defaults={"type": OrganizationType.PROVIDER}
        )
        osi, _ = Organization.objects.get_or_create(
            name="ОСИ «Достык 12» (демо)", defaults={"type": OrganizationType.CUSTOMER}
        )

        users = {}
        for email, name, role in USERS:
            users[role] = self._user(email, name, provider, role)
        self._user("osi@customer.local", "Председатель ОСИ", osi, Role.OSI_REPRESENTATIVE)
        self._user("admin@other.local", "Админ другого поставщика", other, Role.PROVIDER_ADMIN)

        building, created = Building.objects.get_or_create(
            internal_code="ALM-0001",
            defaults={
                "name": "Жилой дом",
                "address": "пр. Достык, 12",
                "floors": 9,
                "entrances": 4,
                "structural_scheme": StructuralScheme.PANEL,
                "created_by": users[Role.PROVIDER_ADMIN],
            },
        )
        if created:
            BuildingOrganizationLink.objects.create(
                building=building, organization=provider, function=LinkFunction.TECHNICAL_SUPPORT
            )
            BuildingOrganizationLink.objects.create(
                building=building, organization=osi, function=LinkFunction.CUSTOMER
            )
            BuildingAssignment.objects.create(building=building, user=users[Role.FIELD_SPECIALIST])
            for n in range(1, (building.entrances or 0) + 1):
                entrance = BuildingElement.objects.create(
                    building=building, element_type_id="entrance", name=f"Подъезд №{n}"
                )
                BuildingElement.objects.create(
                    building=building,
                    parent=entrance,
                    element_type_id="roof",
                    name=f"Кровля над подъездом №{n}",
                )
            for code in ("facade", "basement", "heating", "electrical"):
                BuildingElement.objects.create(
                    building=building,
                    element_type_id=code,
                    name=ElementType.objects.get(pk=code).name,
                )

        template, _ = ChecklistTemplate.objects.get_or_create(
            organization=provider, name="Регулярный визуальный осмотр МКД"
        )
        if not template.versions.exists():
            version = ChecklistTemplateVersion.objects.create(template=template, number=1)
            for i, (etype, code, text, atype, unit) in enumerate(ITEMS):
                ChecklistItem.objects.create(
                    version=version,
                    element_type_id=etype,
                    code=code,
                    text=text,
                    answer_type=atype,
                    unit=unit,
                    sort_order=i,
                )
            version.status = ChecklistTemplateVersion.Status.PUBLISHED
            version.save()

        self.stdout.write(
            self.style.SUCCESS(f"Demo data ready. Password for all users: {PASSWORD}")
        )

    def _user(self, email, name, org, role):
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(email=email, password=PASSWORD, full_name=name)
        OrganizationMembership.objects.get_or_create(user=user, organization=org, role=role)
        return user
