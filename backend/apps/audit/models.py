from django.conf import settings
from django.db import models

from apps.core.models import ProtectedHistoryModel


class AuditAction(models.TextChoices):
    LOGIN = "auth.login", "Вход"
    LOGIN_FAILED = "auth.login_failed", "Неуспешный вход"
    LOGOUT = "auth.logout", "Выход"
    PASSWORD_RESET = "auth.password_reset", "Восстановление пароля"
    SESSION_REVOKED = "auth.session_revoked", "Отзыв сессии"
    USER_BLOCKED = "user.blocked", "Блокировка пользователя"
    USER_INVITED = "user.invited", "Приглашение пользователя"
    ROLE_CHANGED = "membership.changed", "Изменение роли"
    BUILDING_ACCESS_CHANGED = "building_link.changed", "Изменение доступа к дому"
    BUILDING_CHANGED = "building.changed", "Изменение паспорта"
    INSPECTION_STATUS = "inspection.status", "Статус обследования"
    INSPECTION_APPROVED = "inspection.approved", "Утверждение обследования"
    DEFECT_STATUS = "defect.status", "Статус дефекта"
    RISK_ASSESSED = "risk.assessed", "Оценка риска"
    WORK_ORDER_STATUS = "work_order.status", "Статус мероприятия"
    PUBLISHED = "publication", "Публикация для ОСИ"
    REPORT_GENERATED = "report.generated", "Генерация отчёта"
    URGENT_NOTICE = "notification.urgent", "Срочное уведомление"
    ADMIN_ACTION = "admin", "Административное действие"


class AuditEvent(ProtectedHistoryModel):
    """Append-only journal: who, when, what object, which action, what changed (ТЗ 9.6)."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    organization = models.ForeignKey(
        "organizations.Organization", null=True, blank=True, on_delete=models.SET_NULL
    )
    building = models.ForeignKey(
        "buildings.Building", null=True, blank=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=64, choices=AuditAction.choices, db_index=True)
    object_type = models.CharField(max_length=64)
    object_id = models.CharField(max_length=64, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["building", "created_at"]),
            models.Index(fields=["object_type", "object_id"]),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Audit events are immutable")
        super().save(*args, **kwargs)
