import uuid

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.core.models import UUIDModel


def storage_path(instance, filename):
    # Unpredictable keys, original name never used in the path (ТЗ 5.9)
    return f"{instance.organization_id}/{uuid.uuid4().hex}"


class FileKind(models.TextChoices):
    PHOTO = "photo", "Фотография"
    VIDEO = "video", "Видео"
    DOCUMENT = "document", "Технический документ"
    ACT = "act", "Акт"
    REPORT = "report", "PDF-отчёт"
    REPAIR_PHOTO = "repair_photo", "Фото результата ремонта"


class StoredFile(UUIDModel):
    """Metadata in the DB; the binary lives in private S3-compatible storage (ТЗ 7.2)."""

    file = models.FileField(upload_to=storage_path, max_length=255)
    kind = models.CharField(max_length=16, choices=FileKind.choices, default=FileKind.PHOTO)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128)  # detected from content, not the client
    size = models.PositiveBigIntegerField()
    sha256 = models.CharField(max_length=64, db_index=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    caption = models.CharField(max_length=500, blank=True)
    organization = models.ForeignKey(
        "organizations.Organization", null=True, on_delete=models.PROTECT, related_name="+"
    )
    building = models.ForeignKey(
        "buildings.Building", on_delete=models.PROTECT, related_name="files"
    )
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    def __str__(self):
        return self.original_name


class FileLinkQuerySet(models.QuerySet):
    def for_object(self, obj):
        return self.filter(
            content_type=ContentType.objects.get_for_model(obj), object_id=str(obj.pk)
        )


class FileLink(UUIDModel):
    """Attaches a file to any system object: inspection answer, defect, work order..."""

    file = models.ForeignKey(StoredFile, on_delete=models.PROTECT, related_name="links")
    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT)
    object_id = models.CharField(max_length=64)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    objects = FileLinkQuerySet.as_manager()

    class Meta:
        indexes = [models.Index(fields=["content_type", "object_id"])]
        constraints = [
            models.UniqueConstraint(
                fields=["file", "content_type", "object_id"], name="uniq_file_link"
            )
        ]
