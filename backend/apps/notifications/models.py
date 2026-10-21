from django.conf import settings
from django.db import models

from apps.core.models import UUIDModel


class NotificationKind(models.TextChoices):
    URGENT_DEFECT = "urgent_defect", "Срочно: опасный дефект"
    INSPECTION_ASSIGNED = "inspection_assigned", "Назначено обследование"
    INSPECTION_SUBMITTED = "inspection_submitted", "Обследование ожидает проверки"
    INSPECTION_RETURNED = "inspection_returned", "Обследование возвращено"
    PUBLISHED = "published", "Опубликованы результаты"
    WORK_ORDER = "work_order", "Мероприятие"


class Notification(UUIDModel):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=32, choices=NotificationKind.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    building = models.ForeignKey(
        "buildings.Building", null=True, blank=True, on_delete=models.CASCADE
    )
    link = models.CharField(max_length=512, blank=True)  # frontend route
    read_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["recipient", "read_at"])]


class UrgentNotice(UUIDModel):
    """
    Registered fact of an urgent notification about a dangerous defect (ТЗ 5.7).
    It does not replace emergency procedures.
    """

    defect = models.ForeignKey(
        "defects.Defect", on_delete=models.PROTECT, related_name="urgent_notices"
    )
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    recipients = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="+")
    message = models.TextField()
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
