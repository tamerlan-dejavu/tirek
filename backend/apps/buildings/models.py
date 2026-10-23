from django.conf import settings
from django.db import models
from simple_history.models import HistoricalRecords

from apps.core.models import UUIDModel


class StructuralScheme(models.TextChoices):
    UNKNOWN = "unknown", "Неизвестно"
    PANEL = "panel", "Панельная"
    BRICK = "brick", "Кирпичная"
    MONOLITHIC = "monolithic", "Монолитная"
    FRAME = "frame", "Каркасная"
    BLOCK = "block", "Блочная"
    MIXED = "mixed", "Смешанная"


class Building(UUIDModel):
    """
    Digital passport (ТЗ 5.3). Null means «неизвестно» — invented technical values
    are not allowed, so numeric fields are nullable on purpose.
    """

    internal_code = models.CharField("Внутренний идентификатор", max_length=32, unique=True)
    name = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=512, db_index=True)
    city = models.CharField(max_length=128, default="Алматы")
    year_built = models.PositiveSmallIntegerField(null=True, blank=True)
    floors = models.PositiveSmallIntegerField(null=True, blank=True)
    entrances = models.PositiveSmallIntegerField(null=True, blank=True)
    apartments = models.PositiveIntegerField(null=True, blank=True)
    total_area_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    structural_scheme = models.CharField(
        max_length=16, choices=StructuralScheme.choices, default=StructuralScheme.UNKNOWN
    )
    management_organization = models.ForeignKey(
        "organizations.Organization",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_buildings",
    )
    main_photo = models.ForeignKey(
        "files.StoredFile", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    # Registration data only with a legal basis (ТЗ 5.3)
    cadastral_number = models.CharField(max_length=64, blank=True)
    # {"floors": {"source": "техпаспорт БТИ 1998", "recorded_at": "...", "by": "<user id>"}}
    field_sources = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    history = HistoricalRecords(excluded_fields=["updated_at"])

    PASSPORT_FIELDS = [
        "address",
        "name",
        "year_built",
        "floors",
        "entrances",
        "apartments",
        "total_area_m2",
        "structural_scheme",
        "management_organization",
    ]

    class Meta:
        ordering = ["address"]

    def __str__(self):
        return self.name or self.address

    # «Общие сведения» of the digital passport, in the order of the passport structure
    GENERAL_FIELDS = [
        "address",
        "year_built",
        "floors",
        "entrances",
        "total_area_m2",
        "apartments",
        "structural_scheme",
    ]

    @property
    def completeness(self) -> int:
        """
        Share of the digital passport that is known, percent: general fields plus every
        element / system entry. «Неизвестно» counts as not filled; «нет в доме» is known.
        """
        known = sum(
            1
            for f in self.GENERAL_FIELDS
            if getattr(self, f) not in (None, "", StructuralScheme.UNKNOWN)
        )
        total = len(self.GENERAL_FIELDS)
        entries = list(self.passport_entries.values_list("presence", flat=True))
        known += sum(1 for p in entries if p != Presence.UNKNOWN)
        total += len(entries)
        return round(100 * known / total)


class ElementGroup(models.TextChoices):
    STRUCTURAL = "structural", "Конструктивные"
    ENGINEERING = "engineering", "Инженерные системы"
    OPERATIONAL = "operational", "Эксплуатационные"
    LOCATION = "location", "Расположение (подъезд, секция)"


class ElementType(models.Model):
    """Classifier of building elements (ТЗ 5.4). Seeded by a data migration."""

    code = models.SlugField(max_length=64, primary_key=True)
    group = models.CharField(max_length=16, choices=ElementGroup.choices)
    name = models.CharField(max_length=255)
    sort_order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["group", "sort_order"]

    def __str__(self):
        return self.name


class BuildingElement(UUIDModel):
    """
    Hierarchical element: Дом → Подъезд №2 → Кровля → Участок кровли.
    Defects attach to an element, not only to the address.
    """

    building = models.ForeignKey(Building, on_delete=models.PROTECT, related_name="elements")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    element_type = models.ForeignKey(ElementType, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    location = models.CharField("Расположение", max_length=255, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    history = HistoricalRecords(excluded_fields=["updated_at"])

    class Meta:
        ordering = ["element_type__group", "name"]
        indexes = [models.Index(fields=["building", "parent"])]

    def __str__(self):
        return self.name

    @property
    def path(self) -> list[str]:
        node, names = self, []
        while node is not None:
            names.append(node.name)
            node = node.parent
        return list(reversed(names))


class Presence(models.TextChoices):
    PRESENT = "present", "Есть"
    ABSENT = "absent", "Нет в доме"
    UNKNOWN = "unknown", "Неизвестно"


class BuildingPassportEntry(UUIDModel):
    """
    One line of the digital passport: a classifier element or system for this building
    (structural elements, engineering systems, operational elements — ТЗ 5.3–5.4).
    Created for every classifier type, so «not described yet» (unknown) is explicit and
    «absent» (e.g. no gas supply) is a recorded fact, not a missing row.
    """

    building = models.ForeignKey(
        Building, on_delete=models.PROTECT, related_name="passport_entries"
    )
    element_type = models.ForeignKey(ElementType, on_delete=models.PROTECT, related_name="+")
    presence = models.CharField(max_length=8, choices=Presence.choices, default=Presence.UNKNOWN)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    characteristics = models.TextField("Характеристики", blank=True)
    source = models.CharField("Источник сведений", max_length=255, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    history = HistoricalRecords(excluded_fields=["updated_at"])

    class Meta:
        ordering = ["element_type__group", "element_type__sort_order"]
        constraints = [
            models.UniqueConstraint(fields=["building", "element_type"], name="uniq_passport_entry")
        ]

    def __str__(self):
        return f"{self.building} · {self.element_type}"


class BuildingDocument(UUIDModel):
    class Kind(models.TextChoices):
        TECH_PASSPORT = "tech_passport", "Технический паспорт"
        PROJECT = "project", "Проектная документация"
        ACT = "act", "Акт"
        PLAN = "plan", "План / разрез"
        OTHER = "other", "Прочее"

    building = models.ForeignKey(Building, on_delete=models.PROTECT, related_name="documents")
    file = models.ForeignKey("files.StoredFile", on_delete=models.PROTECT)
    kind = models.CharField(max_length=32, choices=Kind.choices, default=Kind.OTHER)
    title = models.CharField(max_length=255)
    document_date = models.DateField(null=True, blank=True)
    is_published = models.BooleanField("Доступен ОСИ", default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
