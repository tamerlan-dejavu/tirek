from django.conf import settings
from django.db import models

from apps.core.models import ProtectedHistoryModel, UUIDModel
from apps.organizations.models import Role


class Priority(models.TextChoices):
    URGENT = "urgent", "Срочно"
    HIGH = "high", "Высокий"
    NORMAL = "normal", "Обычный"
    LOW = "low", "Низкий"


class WorkOrderStatus(models.TextChoices):
    PROPOSED = "proposed", "Предложено"
    AGREED = "agreed", "Согласовано"
    SCHEDULED = "scheduled", "Запланировано"
    IN_PROGRESS = "in_progress", "В работе"
    DONE = "done", "Выполнено"
    VERIFIED = "verified", "Проверено"
    CLOSED = "closed", "Закрыто"
    REJECTED = "rejected", "Отклонено"
    POSTPONED = "postponed", "Отложено"
    CANCELLED = "cancelled", "Отменено"


S = WorkOrderStatus
TRANSITIONS: dict[str, set[str]] = {
    S.PROPOSED: {S.AGREED, S.REJECTED, S.POSTPONED, S.CANCELLED},
    S.POSTPONED: {S.AGREED, S.REJECTED, S.CANCELLED},
    S.AGREED: {S.SCHEDULED, S.POSTPONED, S.CANCELLED},
    S.SCHEDULED: {S.IN_PROGRESS, S.POSTPONED, S.CANCELLED},
    S.IN_PROGRESS: {S.DONE, S.CANCELLED},
    S.DONE: {S.VERIFIED, S.IN_PROGRESS},  # back to work if verification fails
    S.VERIFIED: {S.CLOSED},
    S.CLOSED: set(),
    S.REJECTED: set(),
    S.CANCELLED: set(),
}

# Separation of responsibilities (ТЗ 5.8): who may move the work order INTO a status
ENGINEERING = {Role.REVIEWING_ENGINEER, Role.PROVIDER_ADMIN}
CUSTOMER = {Role.OSI_REPRESENTATIVE}
# ПТО plans production: schedules, reschedules, starts work and records completion
PRODUCTION = {Role.PRODUCTION_PLANNER}
TARGET_ROLES: dict[str, set[str]] = {
    S.AGREED: CUSTOMER,
    S.REJECTED: CUSTOMER,
    S.POSTPONED: CUSTOMER | ENGINEERING | PRODUCTION,
    S.SCHEDULED: CUSTOMER | ENGINEERING | PRODUCTION,
    S.IN_PROGRESS: CUSTOMER | ENGINEERING | PRODUCTION,  # plus the responsible executor
    S.DONE: CUSTOMER | ENGINEERING | PRODUCTION,  # plus the responsible executor
    S.VERIFIED: {Role.REVIEWING_ENGINEER},
    S.CLOSED: ENGINEERING,
    S.CANCELLED: ENGINEERING,
}
EXECUTOR_TARGETS = {S.IN_PROGRESS, S.DONE}
REASON_REQUIRED = {S.REJECTED, S.POSTPONED, S.CANCELLED}


class WorkOrder(UUIDModel):
    number = models.CharField(max_length=32, unique=True)  # WO-2026-0001
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="work_orders"
    )
    defect = models.ForeignKey(
        "defects.Defect",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="work_orders",
    )
    basis = models.TextField("Основание", blank=True)  # when not created from a defect
    element = models.ForeignKey(
        "buildings.BuildingElement", null=True, blank=True, on_delete=models.PROTECT
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=8, choices=Priority.choices, default=Priority.NORMAL)
    recommended_date = models.DateField(null=True, blank=True)
    planned_date = models.DateField(null=True, blank=True, db_index=True)
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="responsible_work_orders",
    )
    responsible_name = models.CharField("Исполнитель (вне системы)", max_length=255, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkOrderStatus.choices, default=S.PROPOSED, db_index=True
    )
    status_reason = models.TextField(blank=True)
    comment = models.TextField(blank=True)
    materials = models.TextField(blank=True)
    labor_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["planned_date", "-created_at"]
        indexes = [models.Index(fields=["building", "status", "planned_date"])]

    def __str__(self):
        return f"{self.number} · {self.title}"

    def files_exist(self) -> bool:
        from apps.files.models import FileLink

        return FileLink.objects.for_object(self).exists()


class WorkOrderEvent(ProtectedHistoryModel):
    """Status history of a work order (AC-13)."""

    work_order = models.ForeignKey(WorkOrder, on_delete=models.PROTECT, related_name="events")
    from_status = models.CharField(max_length=16, choices=WorkOrderStatus.choices, blank=True)
    to_status = models.CharField(max_length=16, choices=WorkOrderStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    actor_role = models.CharField(max_length=32, blank=True)
    reason = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]


class WorkOrderComment(ProtectedHistoryModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.PROTECT, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    text = models.TextField()

    class Meta:
        ordering = ["created_at"]
