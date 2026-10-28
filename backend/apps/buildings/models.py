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


class BuildingType(models.TextChoices):
    """ТЗ 5.3: the type defines passport fields, the element classifier and checklist templates."""

    RESIDENTIAL = "residential", "Многоквартирный жилой дом"
    BUSINESS_CENTER = "business_center", "Бизнес-центр"
    MALL = "mall", "Торговый центр / ТРЦ"
    HOTEL = "hotel", "Гостиница"
    OTHER_COMMERCIAL = "other_commercial", "Иное коммерческое здание"


COMMERCIAL_TYPES = [
    BuildingType.BUSINESS_CENTER,
    BuildingType.MALL,
    BuildingType.HOTEL,
    BuildingType.OTHER_COMMERCIAL,
]


class Building(UUIDModel):
    """
    Digital passport (ТЗ 5.3). Null means «неизвестно» — invented technical values
    are not allowed, so numeric fields are nullable on purpose.
    """

    building_type = models.CharField(
        "Тип здания",
        max_length=20,
        choices=BuildingType.choices,
        default=BuildingType.RESIDENTIAL,
        db_index=True,
    )
    internal_code = models.CharField("Внутренний идентификатор", max_length=32, unique=True)
    name = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=512, db_index=True)
    city = models.CharField(max_length=128, default="Алматы")
    year_built = models.PositiveSmallIntegerField(null=True, blank=True)
    floors = models.PositiveSmallIntegerField(null=True, blank=True)
    entrances = models.PositiveSmallIntegerField(null=True, blank=True)
    apartments = models.PositiveIntegerField(null=True, blank=True)
    total_area_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # Commercial buildings (ТЗ 5.3, preliminary list — refined with engineers)
    leasable_area_m2 = models.DecimalField(
        "Арендопригодная площадь", max_digits=10, decimal_places=2, null=True, blank=True
    )
    premises = models.PositiveIntegerField("Число помещений", null=True, blank=True)
    tenants = models.PositiveIntegerField("Число арендаторов", null=True, blank=True)
    opening_hours = models.CharField("Режим работы", max_length=128, blank=True)
    daily_visitors = models.PositiveIntegerField("Посещаемость в сутки", null=True, blank=True)
    hotel_rooms = models.PositiveIntegerField("Номерной фонд", null=True, blank=True)
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
        "building_type",
        "address",
        "name",
        "year_built",
        "floors",
        "entrances",
        "apartments",
        "total_area_m2",
        "structural_scheme",
        "management_organization",
        "leasable_area_m2",
        "premises",
        "tenants",
        "opening_hours",
        "daily_visitors",
        "hotel_rooms",
    ]

    class Meta:
        ordering = ["address"]

    def __str__(self):
        return self.name or self.address

    # «Общие сведения» of the digital passport by building type, in passport order
    _COMMERCIAL = ["address", "year_built", "floors", "total_area_m2", "leasable_area_m2"]
    GENERAL_FIELDS_BY_TYPE = {
        BuildingType.RESIDENTIAL: [
            "address",
            "year_built",
            "floors",
            "entrances",
            "total_area_m2",
            "apartments",
            "structural_scheme",
        ],
        BuildingType.BUSINESS_CENTER: [
            *_COMMERCIAL,
            "premises",
            "tenants",
            "opening_hours",
            "structural_scheme",
        ],
        BuildingType.MALL: [
            *_COMMERCIAL,
            "premises",
            "tenants",
            "opening_hours",
            "daily_visitors",
            "structural_scheme",
        ],
        BuildingType.HOTEL: [
            "address",
            "year_built",
            "floors",
            "total_area_m2",
            "hotel_rooms",
            "premises",
            "structural_scheme",
        ],
        BuildingType.OTHER_COMMERCIAL: [*_COMMERCIAL, "premises", "tenants", "structural_scheme"],
    }

    @property
    def general_fields(self) -> list[str]:
        return self.GENERAL_FIELDS_BY_TYPE[self.building_type]

    @property
    def is_commercial(self) -> bool:
        return self.building_type in COMMERCIAL_TYPES

    @property
    def completeness(self) -> int:
        """
        Share of the digital passport that is known, percent: general fields plus every
        element / system entry. «Неизвестно» counts as not filled; «нет в доме» is known.
        """
        known = sum(
            1
            for f in self.general_fields
            if getattr(self, f) not in (None, "", StructuralScheme.UNKNOWN)
        )
        total = len(self.general_fields)
        applicable = ElementType.codes_for(self.building_type)
        entries = list(
            self.passport_entries.filter(element_type__in=applicable).values_list(
                "presence", flat=True
            )
        )
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
    # Building types the element applies to (ТЗ 5.4); empty = every type
    building_types = models.JSONField(default=list, blank=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["group", "sort_order"]

    def __str__(self):
        return self.name

    def applies_to(self, building_type: str) -> bool:
        return not self.building_types or building_type in self.building_types

    @classmethod
    def codes_for(cls, building_type: str) -> list[str]:
        """Active classifier codes for a building type (filtered in Python: JSON lookups
        differ between PostgreSQL and SQLite, and the classifier is a few dozen rows)."""
        return [t.code for t in cls.objects.filter(is_active=True) if t.applies_to(building_type)]


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
    ABSENT = "absent", "Нет в здании"
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
