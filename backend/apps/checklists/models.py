from django.conf import settings
from django.db import models

from apps.core.models import UUIDModel


class InspectionType(models.TextChoices):
    # MVP: only the regular visual inspection; others after procedures are agreed (ТЗ 5.5)
    VISUAL_REGULAR = "visual_regular", "Регулярный визуальный эксплуатационный осмотр"


class AnswerType(models.TextChoices):
    COMPLIANCE = "compliance", "Соответствует / не соответствует / неприменимо"
    NUMBER = "number", "Число с единицей"
    TEXT = "text", "Текст"
    DATE = "date", "Дата"
    PHOTO = "photo", "Фото"
    CHOICE = "choice", "Значение из классификатора"


class ChecklistTemplate(UUIDModel):
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.PROTECT, related_name="checklist_templates"
    )
    inspection_type = models.CharField(
        max_length=32, choices=InspectionType.choices, default=InspectionType.VISUAL_REGULAR
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    def __str__(self):
        return self.name


class ChecklistTemplateVersion(UUIDModel):
    """
    A published version is frozen: inspections reference it, so editing the template
    later never changes inspections already performed (ТЗ 5.5).
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликована"
        ARCHIVED = "archived", "В архиве"

    template = models.ForeignKey(
        ChecklistTemplate, on_delete=models.PROTECT, related_name="versions"
    )
    number = models.PositiveIntegerField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    approved_by_note = models.CharField(
        "Кем утверждён чек-лист", max_length=255, blank=True
    )  # ТЗ 15.2 q.3
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["template", "-number"]
        constraints = [
            models.UniqueConstraint(fields=["template", "number"], name="uniq_template_version")
        ]

    def __str__(self):
        return f"{self.template} v{self.number}"

    @property
    def is_editable(self):
        return self.status == self.Status.DRAFT


class ChecklistItem(UUIDModel):
    version = models.ForeignKey(
        ChecklistTemplateVersion, on_delete=models.PROTECT, related_name="items"
    )
    # Checklist is split by building element (ТЗ 5.5)
    element_type = models.ForeignKey(
        "buildings.ElementType", null=True, blank=True, on_delete=models.PROTECT
    )
    code = models.CharField(max_length=32)
    text = models.TextField()
    guidance = models.TextField("Указания для специалиста", blank=True)
    answer_type = models.CharField(max_length=16, choices=AnswerType.choices)
    unit = models.CharField(max_length=32, blank=True)
    choices = models.JSONField(default=list, blank=True)  # for AnswerType.CHOICE
    is_required = models.BooleanField(default=True)
    photo_required_on_fail = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["version", "sort_order"]
        constraints = [
            models.UniqueConstraint(fields=["version", "code"], name="uniq_item_code_per_version")
        ]
