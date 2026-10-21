from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core.state_machine import assert_transition

from .models import TRANSITIONS, Defect, DefectEvent, DefectStatus


def next_number() -> str:
    year = timezone.now().year
    count = Defect.objects.filter(number__startswith=f"DEF-{year}-").count() + 1
    return f"DEF-{year}-{count:04d}"


@transaction.atomic
def change_status(defect: Defect, target: str, request, comment: str = "") -> Defect:
    assert_transition(TRANSITIONS, defect.status, target)
    before = defect.status
    defect.status = target
    defect.save()
    DefectEvent.objects.create(
        defect=defect, from_status=before, to_status=target, actor=request.user, comment=comment
    )
    log(
        AuditAction.DEFECT_STATUS,
        defect,
        request=request,
        changes={"from": before, "to": target, "comment": comment},
    )
    return defect


def request_clarification(defect: Defect, request, comment: str) -> Defect:
    if not comment.strip():
        raise ValidationError({"comment": "Опишите, что нужно уточнить."})
    return change_status(defect, DefectStatus.NEEDS_CLARIFICATION, request, comment)


def reject(defect: Defect, request, reason: str) -> Defect:
    if not reason.strip():
        raise ValidationError({"reason": "Обоснование отклонения обязательно."})
    defect.rejection_reason = reason
    return change_status(defect, DefectStatus.REJECTED, request, reason)


def close(defect: Defect, request, basis: str) -> Defect:
    """Closing requires a basis and an authorized confirmation (ТЗ 5.6)."""
    if not basis.strip():
        raise ValidationError({"basis": "Укажите основание закрытия."})
    defect.closure_basis = basis
    defect.closed_at = timezone.now()
    defect.closed_by = request.user
    return change_status(defect, DefectStatus.CLOSED, request, basis)
