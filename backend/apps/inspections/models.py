from django.conf import settings
from django.db import models

from apps.checklists.models import InspectionType
from apps.core.models import ProtectedHistoryModel, UUIDModel


class InspectionStatus(models.TextChoices):
    DRAFT = "draft", "Черновик"
    SUBMITTED = "submitted", "Отправлено на проверку"
    RETURNED = "returned", "Возвращено на доработку"
    APPROVED = "approved", "Утверждено"
    CANCELLED = "cancelled", "Отменено"


# Lifecycle (ТЗ 5.5)
TRANSITIONS: dict[str, set[str]] = {
    InspectionStatus.DRAFT: {InspectionStatus.SUBMITTED, InspectionStatus.CANCELLED},
    InspectionStatus.SUBMITTED: {InspectionStatus.APPROVED, InspectionStatus.RETURNED},
    InspectionStatus.RETURNED: {InspectionStatus.SUBMITTED, InspectionStatus.CANCELLED},
    InspectionStatus.APPROVED: set(),
    InspectionStatus.CANCELLED: set(),
}

EDITABLE_STATUSES = {InspectionStatus.DRAFT, InspectionStatus.RETURNED}


class Inspection(UUIDModel):
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="inspections"
    )
    provider_organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="+"
    )
    template_version = models.ForeignKey(
        "checklists.ChecklistTemplateVersion", on_delete=models.PROTECT, related_name="inspections"
    )
    inspection_type = models.CharField(
        max_length=32, choices=InspectionType.choices, default=InspectionType.VISUAL_REGULAR
    )
    number = models.CharField(max_length=32, unique=True)  # human id, e.g. INS-2026-0001
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="assigned_inspections"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="reviewed_inspections",
    )
    status = models.CharField(
        max_length=16,
        choices=InspectionStatus.choices,
        default=InspectionStatus.DRAFT,
        db_index=True,
    )
    planned_date = models.DateField(null=True, blank=True)
    performed_at = models.DateTimeField(null=True, blank=True)
    scope_and_limitations = models.TextField("Область и ограничения осмотра", blank=True)
    weather_conditions = models.CharField(max_length=255, blank=True)
    summary = models.TextField(blank=True)
    cancel_reason = models.TextField(blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    # Published to the customer (ОСИ). Only approved inspections can be published (AC-11)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    # Approved results are never rewritten: a correction is a new version (ТЗ 5.5)
    version = models.PositiveIntegerField(default=1)
    supersedes = models.OneToOneField(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="superseded_by"
    )
    correction_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["building", "status"]),
            models.Index(fields=["assignee", "status"]),
        ]

    def __str__(self):
        return self.number

    @property
    def is_editable(self):
        return self.status in EDITABLE_STATUSES


class ComplianceValue(models.TextChoices):
    OK = "ok", "Соответствует"
    FAIL = "fail", "Не соответствует"
    NA = "na", "Неприменимо"


class InspectionAnswer(UUIDModel):
    """Answer to one checklist item, optionally for a specific element (e.g. Подъезд №2)."""

    inspection = models.ForeignKey(Inspection, on_delete=models.PROTECT, related_name="answers")
    item = models.ForeignKey("checklists.ChecklistItem", on_delete=models.PROTECT)
    element = models.ForeignKey(
        "buildings.BuildingElement", null=True, blank=True, on_delete=models.PROTECT
    )
    compliance = models.CharField(max_length=8, choices=ComplianceValue.choices, blank=True)
    number_value = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    text_value = models.TextField(blank=True)
    date_value = models.DateField(null=True, blank=True)
    choice_value = models.CharField(max_length=128, blank=True)
    comment = models.TextField(blank=True)
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["inspection", "item", "element"], name="uniq_answer_per_item_element"
            )
        ]

    @property
    def is_filled(self) -> bool:
        return bool(
            self.compliance
            or self.number_value is not None
            or self.text_value
            or self.date_value
            or self.choice_value
            or self.files.exists()
        )

    @property
    def files(self):
        from apps.files.models import FileLink

        return FileLink.objects.for_object(self)


class InspectionReview(ProtectedHistoryModel):
    """Every review decision is kept (ТЗ 5.6 «история проверок»)."""

    class Decision(models.TextChoices):
        APPROVED = "approved", "Утверждено"
        RETURNED = "returned", "Возвращено на доработку"

    inspection = models.ForeignKey(Inspection, on_delete=models.PROTECT, related_name="reviews")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    decision = models.CharField(max_length=16, choices=Decision.choices)
    comment = models.TextField(blank=True)
    # Per-item remarks: [{"answer": "<uuid>", "comment": "..."}]
    item_comments = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]
