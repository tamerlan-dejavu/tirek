from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core.state_machine import assert_transition
from apps.defects.models import Defect, DefectStatus

from .models import (
    TRANSITIONS,
    ComplianceValue,
    Inspection,
    InspectionAnswer,
    InspectionReview,
    InspectionStatus,
)


def next_number() -> str:
    year = timezone.now().year
    count = Inspection.objects.filter(number__startswith=f"INS-{year}-").count() + 1
    return f"INS-{year}-{count:04d}"


def missing_required(inspection: Inspection) -> list[dict]:
    """Required items without an answer, plus failed items without the required photo."""
    answers = {a.item_id: a for a in inspection.answers.all()}
    problems = []
    for item in inspection.template_version.items.all():
        answer = answers.get(item.pk)
        if item.is_required and (answer is None or not answer.is_filled):
            problems.append({"item": str(item.pk), "code": item.code, "problem": "not_answered"})
        elif (
            answer
            and item.photo_required_on_fail
            and answer.compliance == ComplianceValue.FAIL
            and not answer.files.exists()
        ):
            problems.append({"item": str(item.pk), "code": item.code, "problem": "photo_required"})
    return problems


def _set_status(inspection: Inspection, target: str, request, **changes) -> None:
    assert_transition(TRANSITIONS, inspection.status, target)
    before = inspection.status
    inspection.status = target
    inspection.save()
    log(
        AuditAction.INSPECTION_STATUS,
        inspection,
        request=request,
        changes={"from": before, "to": target, **changes},
    )


@transaction.atomic
def submit(inspection: Inspection, request) -> None:
    problems = missing_required(inspection)
    if problems:
        raise ValidationError({"missing": problems}, code="incomplete")
    inspection.submitted_at = timezone.now()
    inspection.performed_at = inspection.performed_at or timezone.now()
    _set_status(inspection, InspectionStatus.SUBMITTED, request)
    inspection.defects.filter(status=DefectStatus.DETECTED).update(status=DefectStatus.IN_REVIEW)


@transaction.atomic
def return_for_rework(inspection: Inspection, request, comment: str, item_comments=None) -> None:
    if not comment.strip():
        raise ValidationError({"comment": "Укажите, что нужно доработать."})
    InspectionReview.objects.create(
        inspection=inspection,
        reviewer=request.user,
        decision=InspectionReview.Decision.RETURNED,
        comment=comment,
        item_comments=item_comments or [],
    )
    _set_status(inspection, InspectionStatus.RETURNED, request, comment=comment)


@transaction.atomic
def approve(inspection: Inspection, request, comment: str = "") -> None:
    pending = inspection.defects.filter(
        status__in=[DefectStatus.DETECTED, DefectStatus.IN_REVIEW, DefectStatus.NEEDS_CLARIFICATION]
    )
    if pending.exists():
        raise ValidationError(
            {"defects": "Все дефекты обследования должны быть подтверждены или отклонены."},
            code="defects_pending",
        )
    InspectionReview.objects.create(
        inspection=inspection,
        reviewer=request.user,
        decision=InspectionReview.Decision.APPROVED,
        comment=comment,
    )
    inspection.approved_at = timezone.now()
    inspection.approved_by = request.user
    inspection.reviewer = request.user
    _set_status(inspection, InspectionStatus.APPROVED, request)
    log(AuditAction.INSPECTION_APPROVED, inspection, request=request)


@transaction.atomic
def cancel(inspection: Inspection, request, reason: str) -> None:
    if not reason.strip():
        raise ValidationError({"reason": "Причина отмены обязательна."})
    inspection.cancel_reason = reason
    _set_status(inspection, InspectionStatus.CANCELLED, request, reason=reason)


@transaction.atomic
def publish(inspection: Inspection, request) -> None:
    if inspection.status != InspectionStatus.APPROVED:
        raise ValidationError(
            "Публиковать можно только утверждённое обследование.", code="not_approved"
        )
    if inspection.published_at:
        return
    inspection.published_at = timezone.now()
    inspection.published_by = request.user
    inspection.save(update_fields=["published_at", "published_by", "updated_at"])
    log(AuditAction.PUBLISHED, inspection, request=request)


@transaction.atomic
def create_correction(inspection: Inspection, request, reason: str) -> Inspection:
    """Approved data is immutable — corrections become a new draft version with a log."""
    if inspection.status != InspectionStatus.APPROVED:
        raise ValidationError("Исправления оформляются только для утверждённых обследований.")
    if hasattr(inspection, "superseded_by"):
        raise ValidationError("Для этой версии уже создано исправление.")
    if not reason.strip():
        raise ValidationError({"reason": "Укажите причину исправления."})
    correction = Inspection.objects.create(
        building=inspection.building,
        provider_organization=inspection.provider_organization,
        template_version=inspection.template_version,
        inspection_type=inspection.inspection_type,
        number=f"{inspection.number.split('/')[0]}/v{inspection.version + 1}",
        assignee=inspection.assignee,
        reviewer=inspection.reviewer,
        planned_date=inspection.planned_date,
        performed_at=inspection.performed_at,
        scope_and_limitations=inspection.scope_and_limitations,
        summary=inspection.summary,
        version=inspection.version + 1,
        supersedes=inspection,
        correction_reason=reason,
        created_by=request.user,
    )
    for answer in inspection.answers.all():
        InspectionAnswer.objects.create(
            inspection=correction,
            item=answer.item,
            element=answer.element,
            compliance=answer.compliance,
            number_value=answer.number_value,
            text_value=answer.text_value,
            date_value=answer.date_value,
            choice_value=answer.choice_value,
            comment=answer.comment,
            answered_by=answer.answered_by,
        )
    log(
        AuditAction.INSPECTION_STATUS,
        correction,
        request=request,
        changes={"correction_of": str(inspection.pk), "reason": reason},
    )
    return correction


def defects_of(inspection: Inspection):
    return Defect.objects.filter(inspection=inspection)
