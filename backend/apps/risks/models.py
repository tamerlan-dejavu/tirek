from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import ProtectedHistoryModel
from apps.defects.models import RiskCategory


class RiskAssessment(ProtectedHistoryModel):
    """
    Expert assignment of a risk category with justification (ТЗ 5.7).
    No automatic formula. Every revision is a new row; the defect points to the current one,
    so assessments can never be silently changed retroactively (ТЗ 9.7).
    """

    defect = models.ForeignKey(
        "defects.Defect", on_delete=models.PROTECT, related_name="risk_assessments"
    )
    category = models.CharField(max_length=2, choices=RiskCategory.choices)
    # Scoring aid (methodology.py): factors 1–5, their product and the suggested category.
    # The engineer's `category` is final; a difference from `suggested_category` is an override.
    probability = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    consequences = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    condition = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    service_life = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    suggested_category = models.CharField(max_length=2, choices=RiskCategory.choices, blank=True)
    hazard_description = models.TextField("Описание опасности")
    justification = models.TextField("Обоснование")
    recommended_actions = models.TextField("Рекомендуемые действия")
    engineer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)
    supersedes = models.OneToOneField(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="superseded_by"
    )
    revision_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["defect", "-version"]
        constraints = [
            models.UniqueConstraint(fields=["defect", "version"], name="uniq_risk_version")
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValueError("Risk assessments are immutable; create a revision instead")
        super().save(*args, **kwargs)
