from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import UUIDModel


class OrganizationType(models.TextChoices):
    PROVIDER = "provider", "Поставщик инженерных услуг"
    CUSTOMER = "customer", "Заказчик (ОСИ / управляющая организация)"


class Role(models.TextChoices):
    PROVIDER_ADMIN = "provider_admin", "Администратор поставщика"
    FIELD_SPECIALIST = "field_specialist", "Полевой специалист"
    REVIEWING_ENGINEER = "reviewing_engineer", "Проверяющий инженер"
    OSI_REPRESENTATIVE = "osi_representative", "Представитель ОСИ"


class LinkFunction(models.TextChoices):
    CUSTOMER = "customer", "Заказчик"
    TECHNICAL_SUPPORT = "technical_support", "Техническое сопровождение"
    EXPERTISE = "expertise", "Специализированная экспертиза"
    MANAGEMENT = "management", "Управление домом"


class Organization(UUIDModel):
    """Any organization. EITC is just one possible provider, not hard-coded (ТЗ 4.1)."""

    type = models.CharField(max_length=16, choices=OrganizationType.choices, db_index=True)
    name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=512, blank=True)
    bin = models.CharField("БИН", max_length=12, blank=True)
    address = models.CharField(max_length=512, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    def __str__(self):
        return self.name


class OrganizationMembership(UUIDModel):
    """User ↔ organization with a role. One user may hold roles in several organizations."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=32, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization", "role"], name="uniq_membership_role"
            )
        ]
        indexes = [models.Index(fields=["organization", "is_active"])]


class BuildingOrganizationLink(UUIDModel):
    """
    Which organization does what for a building and for which period (ТЗ 4.4).
    Links are closed (valid_to), never deleted, so the history is kept.
    """

    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="organization_links"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="building_links"
    )
    function = models.CharField(max_length=32, choices=LinkFunction.choices)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        indexes = [models.Index(fields=["building", "organization", "valid_to"])]
        constraints = [
            models.CheckConstraint(
                condition=Q(valid_to__isnull=True) | Q(valid_to__gt=models.F("valid_from")),
                name="link_valid_period",
            )
        ]

    @property
    def is_active(self):
        now = timezone.now()
        return self.valid_from <= now and (self.valid_to is None or self.valid_to > now)


class BuildingAssignment(UUIDModel):
    """Field specialist assigned to a building by the provider admin (ТЗ 4.2)."""

    building = models.ForeignKey(
        "buildings.Building", on_delete=models.CASCADE, related_name="assignments"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="building_assignments"
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["building", "user"], name="uniq_building_assignment")
        ]
