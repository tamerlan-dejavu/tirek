"""
Resident requests (заявки) and polls.

A request is a SIGNAL from a resident, not an engineering finding: the dispatcher triages it
and may turn it into a defect that then follows the normal review workflow (ТЗ 2.3 p.4 —
technical conclusions are confirmed by specialists).
Polls are advisory surveys, not legally binding owners' votes (those are out of MVP scope).
"""

from django.conf import settings
from django.db import models

from apps.core.models import ProtectedHistoryModel, UUIDModel


class RequestCategory(models.TextChoices):
    LEAK = "leak", "Протечка, затопление"
    HEATING = "heating", "Отопление"
    WATER = "water", "Водоснабжение"
    SEWERAGE = "sewerage", "Канализация"
    ELECTRICAL = "electrical", "Электричество"
    ELEVATOR = "elevator", "Лифт"
    ROOF = "roof", "Кровля, чердак"
    FACADE = "facade", "Фасад, балконы"
    COMMON_AREAS = "common_areas", "Подъезд, общие помещения"
    OTHER = "other", "Другое"


class RequestStatus(models.TextChoices):
    NEW = "new", "Новая"
    ACCEPTED = "accepted", "Принята"
    IN_PROGRESS = "in_progress", "В работе"
    RESOLVED = "resolved", "Решена"
    REJECTED = "rejected", "Отклонена"


TRANSITIONS: dict[str, set[str]] = {
    RequestStatus.NEW: {RequestStatus.ACCEPTED, RequestStatus.REJECTED},
    RequestStatus.ACCEPTED: {
        RequestStatus.IN_PROGRESS,
        RequestStatus.RESOLVED,
        RequestStatus.REJECTED,
    },
    RequestStatus.IN_PROGRESS: {RequestStatus.RESOLVED},
    RequestStatus.RESOLVED: set(),
    RequestStatus.REJECTED: set(),
}
OPEN_REQUEST_STATUSES = [RequestStatus.NEW, RequestStatus.ACCEPTED, RequestStatus.IN_PROGRESS]


class ServiceRequest(UUIDModel):
    number = models.CharField(max_length=32, unique=True)  # REQ-2026-0001
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="service_requests"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="service_requests",
    )  # empty when the dispatcher registers a phone call
    category = models.CharField(max_length=16, choices=RequestCategory.choices)
    entrance = models.PositiveSmallIntegerField(null=True, blank=True)
    floor = models.SmallIntegerField(null=True, blank=True)
    apartment = models.CharField(max_length=16, blank=True)
    place = models.CharField("Где именно", max_length=255, blank=True)
    description = models.TextField()
    contact_phone = models.CharField(max_length=32, blank=True)
    is_emergency = models.BooleanField(
        "Житель отметил аварию", default=False
    )  # resident's claim, confirmed separately
    emergency_confirmed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=RequestStatus.choices, default=RequestStatus.NEW, db_index=True
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assigned_service_requests",
    )
    due_date = models.DateField(null=True, blank=True)
    resolution = models.TextField(blank=True)
    defect = models.ForeignKey(
        "defects.Defect", null=True, blank=True, on_delete=models.PROTECT, related_name="requests"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["building", "status"])]

    def __str__(self):
        return self.number


class ServiceRequestEvent(ProtectedHistoryModel):
    request = models.ForeignKey(ServiceRequest, on_delete=models.PROTECT, related_name="events")
    from_status = models.CharField(max_length=16, choices=RequestStatus.choices, blank=True)
    to_status = models.CharField(max_length=16, choices=RequestStatus.choices)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["created_at"]


class Poll(UUIDModel):
    """Advisory survey of residents. Not a legally binding vote of owners."""

    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="polls"
    )
    question = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.question


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=255)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.text


class PollVote(UUIDModel):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="votes")
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["poll", "user"], name="one_vote_per_poll")]
