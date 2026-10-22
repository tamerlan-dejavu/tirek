from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.defects import services as defect_services
from apps.defects.models import PRIORITY_BY_RISK, Defect, DefectStatus, RiskCategory
from apps.notifications.services import notify_urgent_defect

from .models import RiskAssessment

URGENT_CATEGORIES = {RiskCategory.R1}


@transaction.atomic
def assess(
    defect: Defect,
    request,
    *,
    category,
    hazard_description,
    justification,
    recommended_actions,
    revision_reason: str = "",
) -> RiskAssessment:
    """
    Confirm a defect with a risk category, or revise an existing assessment.
    First assessment moves the defect «На проверке» → «Подтверждён».
    """
    previous = defect.current_risk
    if previous and not revision_reason.strip():
        raise ValidationError({"revision_reason": "Укажите причину пересмотра оценки."})
    if previous is None and defect.status != DefectStatus.IN_REVIEW:
        raise ValidationError("Подтвердить можно только дефект на проверке.")

    assessment = RiskAssessment.objects.create(
        defect=defect,
        category=category,
        hazard_description=hazard_description,
        justification=justification,
        recommended_actions=recommended_actions,
        engineer=request.user,
        version=(previous.version + 1) if previous else 1,
        supersedes=previous,
        revision_reason=revision_reason,
    )
    defect.current_risk = assessment
    if not defect.recommendations:
        defect.recommendations = recommended_actions
    if not defect.priority:
        # Suggested urgency from the danger degree; the engineer can change it afterwards
        defect.priority = PRIORITY_BY_RISK[category]
    defect.save(update_fields=["current_risk", "recommendations", "priority", "updated_at"])
    if previous is None:
        defect_services.change_status(defect, DefectStatus.CONFIRMED, request, justification)

    log(
        AuditAction.RISK_ASSESSED,
        defect,
        request=request,
        changes={
            "category": category,
            "previous": previous.category if previous else None,
            "version": assessment.version,
        },
    )
    if category in URGENT_CATEGORIES:
        notify_urgent_defect(defect, assessment, request=request)
    return assessment
