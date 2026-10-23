from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import ProtectedHistoryModel, UUIDModel


class RiskCategory(models.TextChoices):
    R1 = "R1", "R1 — критический"
    R2 = "R2", "R2 — высокий"
    R3 = "R3", "R3 — средний"
    R4 = "R4", "R4 — низкий"


class DefectStatus(models.TextChoices):
    DETECTED = "detected", "Обнаружен"
    IN_REVIEW = "in_review", "На проверке"
    NEEDS_CLARIFICATION = "needs_clarification", "Требует уточнения"
    CONFIRMED = "confirmed", "Подтверждён"
    PLANNED = "planned", "Запланирован"
    FIXING = "fixing", "Устраняется"
    FIX_REVIEW = "fix_review", "Проверка устранения"
    CLOSED = "closed", "Закрыт"
    REJECTED = "rejected", "Отклонён как ошибочный"


# Lifecycle (ТЗ 5.6)
TRANSITIONS: dict[str, set[str]] = {
    DefectStatus.DETECTED: {DefectStatus.IN_REVIEW},
    DefectStatus.IN_REVIEW: {
        DefectStatus.CONFIRMED,
        DefectStatus.NEEDS_CLARIFICATION,
        DefectStatus.REJECTED,
    },
    DefectStatus.NEEDS_CLARIFICATION: {DefectStatus.IN_REVIEW},
    DefectStatus.CONFIRMED: {DefectStatus.PLANNED, DefectStatus.CLOSED},
    DefectStatus.PLANNED: {DefectStatus.FIXING, DefectStatus.CONFIRMED},
    DefectStatus.FIXING: {DefectStatus.FIX_REVIEW},
    DefectStatus.FIX_REVIEW: {DefectStatus.CLOSED, DefectStatus.FIXING},
    DefectStatus.CLOSED: set(),
    DefectStatus.REJECTED: set(),
}

OPEN_STATUSES = [
    DefectStatus.DETECTED,
    DefectStatus.IN_REVIEW,
    DefectStatus.NEEDS_CLARIFICATION,
    DefectStatus.CONFIRMED,
    DefectStatus.PLANNED,
    DefectStatus.FIXING,
    DefectStatus.FIX_REVIEW,
]


class DefectPriority(models.TextChoices):
    """Urgency of elimination. Separate from the danger degree: set by the engineer."""

    URGENT = "urgent", "Срочно"
    HIGH = "high", "Высокий"
    NORMAL = "normal", "Обычный"
    LOW = "low", "Низкий"


# Default priority suggested from the approved danger degree; the engineer may override it
PRIORITY_BY_RISK = {
    RiskCategory.R1: DefectPriority.URGENT,
    RiskCategory.R2: DefectPriority.HIGH,
    RiskCategory.R3: DefectPriority.NORMAL,
    RiskCategory.R4: DefectPriority.LOW,
}


class DefectCategory(models.Model):
    """
    Kind of defect (трещины, протечки, коррозия…). A reference list maintained by the
    administrator and extended over time from accumulated statistics.
    """

    code = models.SlugField(max_length=48, primary_key=True)
    name = models.CharField(max_length=128, unique=True)
    description = models.CharField(max_length=500, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Defect(UUIDModel):
    number = models.CharField(max_length=32, unique=True)  # DEF-2026-0001
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="defects"
    )
    element = models.ForeignKey(
        "buildings.BuildingElement", on_delete=models.PROTECT, related_name="defects"
    )
    location = models.CharField("Место", max_length=255, blank=True)
    category = models.ForeignKey(
        DefectCategory, null=True, blank=True, on_delete=models.PROTECT, related_name="defects"
    )
    priority = models.CharField(
        max_length=8, choices=DefectPriority.choices, blank=True, db_index=True
    )  # empty until the engineer assesses the defect
    inspection = models.ForeignKey(
        "inspections.Inspection",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="defects",
    )
    # Created right from a checklist item (ТЗ 5.5)
    answer = models.ForeignKey(
        "inspections.InspectionAnswer",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="defects",
    )
    defect_type = models.CharField(max_length=128)
    description = models.TextField()
    detected_on = models.DateField(default=timezone.localdate)
    preliminary_severity = models.CharField(
        max_length=2, choices=RiskCategory.choices, blank=True
    )  # set by the field specialist, NOT an approved assessment
    current_risk = models.OneToOneField(
        "risks.RiskAssessment", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    recommendations = models.TextField(blank=True)
    status = models.CharField(
        max_length=24, choices=DefectStatus.choices, default=DefectStatus.DETECTED, db_index=True
    )
    rejection_reason = models.TextField(blank=True)
    closure_basis = models.TextField("Основание закрытия", blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["building", "status"]),
            models.Index(fields=["element"]),
        ]

    def __str__(self):
        return f"{self.number} · {self.defect_type}"

    @property
    def approved_risk(self):
        return self.current_risk.category if self.current_risk_id else None


class DefectObservation(ProtectedHistoryModel):
    """Repeated observation of the same defect — history, not overwrite (ТЗ 5.6, AC-17)."""

    class Trend(models.TextChoices):
        WORSE = "worse", "Ухудшение"
        SAME = "same", "Без изменений"
        BETTER = "better", "Улучшение"

    defect = models.ForeignKey(Defect, on_delete=models.PROTECT, related_name="observations")
    inspection = models.ForeignKey(
        "inspections.Inspection", null=True, blank=True, on_delete=models.PROTECT
    )
    observed_on = models.DateField(default=timezone.localdate)
    description = models.TextField()
    trend = models.CharField(max_length=8, choices=Trend.choices, default=Trend.SAME)
    observer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    class Meta:
        ordering = ["observed_on", "created_at"]


class DefectEvent(ProtectedHistoryModel):
    """Status / review timeline of a defect."""

    defect = models.ForeignKey(Defect, on_delete=models.PROTECT, related_name="events")
    from_status = models.CharField(max_length=24, choices=DefectStatus.choices, blank=True)
    to_status = models.CharField(max_length=24, choices=DefectStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]
