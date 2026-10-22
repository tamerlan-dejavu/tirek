from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core import numbering
from apps.core.state_machine import assert_transition

from .models import TRANSITIONS, Defect, DefectEvent, DefectStatus


def next_number() -> str:
    return numbering.next_number(Defect, "DEF")


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


# Unambiguous keyword → category hints, used to pre-fill demo and imported data
CATEGORY_HINTS = [
    ("корроз", "corrosion"),
    ("протеч", "leaks"),
    ("подтоплен", "leaks"),
    ("течь", "leaks"),
    ("трещ", "cracks"),
    ("шва", "cracks"),
    ("отслоен", "destruction"),
    ("разрушен", "destruction"),
    ("смещен", "deformation"),
    ("просадк", "deformation"),
]


def guess_category(text: str) -> str | None:
    low = text.lower()
    return next((code for kw, code in CATEGORY_HINTS if kw in low), None)
