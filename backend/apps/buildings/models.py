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

    @property
    def completeness(self) -> int:
        """Share of filled passport fields, percent. «Неизвестно» counts as not filled."""
        filled = 0
        for field in self.PASSPORT_FIELDS:
            value = getattr(self, field)
            if value not in (None, "", StructuralScheme.UNKNOWN):
                filled += 1
        return round(100 * filled / len(self.PASSPORT_FIELDS))


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
