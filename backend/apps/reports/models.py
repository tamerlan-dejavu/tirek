from django.conf import settings
from django.db import models

from apps.core.models import ProtectedHistoryModel


class ReportStatus(models.TextChoices):
    PENDING = "pending", "В очереди"
    GENERATING = "generating", "Формируется"
    READY = "ready", "Готов"
    FAILED = "failed", "Ошибка"


class Report(ProtectedHistoryModel):
    """
    Versioned, immutable PDF built from approved data only (ТЗ 5.11, AC-15, AC-16).
    `snapshot` freezes the exact data used, so re-downloads never change the content.
    """

    inspection = models.ForeignKey(
        "inspections.Inspection", on_delete=models.PROTECT, related_name="reports"
    )
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="reports"
    )
    version = models.PositiveIntegerField()
    status = models.CharField(
        max_length=16, choices=ReportStatus.choices, default=ReportStatus.PENDING
    )
    snapshot = models.JSONField(default=dict)
    file = models.OneToOneField(
        "files.StoredFile", null=True, blank=True, on_delete=models.PROTECT, related_name="report"
    )
    sha256 = models.CharField(max_length=64, blank=True)
    error = models.TextField(blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["inspection", "version"], name="uniq_report_version")
        ]

    def __str__(self):
        return f"{self.inspection} · отчёт v{self.version}"
