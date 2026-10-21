import uuid

from django.conf import settings
from django.db import models


class UUIDModel(models.Model):
    """Base for every domain table: UUID primary key, UTC timestamps (ТЗ 7.2)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ProtectedHistoryModel(UUIDModel):
    """Historical records: deletion is forbidden at the ORM level (ТЗ 7.2)."""

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        raise models.ProtectedError(f"{type(self).__name__} is a historical record", {self})


class IdempotencyKey(models.Model):
    """Stored response for a client-provided Idempotency-Key, so retries are not re-applied."""

    key = models.CharField(max_length=128)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    method = models.CharField(max_length=8)
    path = models.CharField(max_length=512)
    status_code = models.PositiveSmallIntegerField()
    response_body = models.BinaryField()
    content_type = models.CharField(max_length=128, default="application/json")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "key"], name="uniq_idempotency_key_per_user")
        ]

    def __str__(self):
        return f"{self.method} {self.path} [{self.key}]"
