from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core import access
from apps.core.state_machine import assert_transition
from apps.defects import services as defect_services
from apps.defects.models import DefectStatus

from .models import (
    EXECUTOR_TARGETS,
    REASON_REQUIRED,
    TARGET_ROLES,
    TRANSITIONS,
    WorkOrder,
    WorkOrderEvent,
    WorkOrderStatus,
)

S = WorkOrderStatus

# Work order status → defect status it implies
DEFECT_SYNC = {
    S.SCHEDULED: (DefectStatus.CONFIRMED, DefectStatus.PLANNED),
    S.IN_PROGRESS: (DefectStatus.PLANNED, DefectStatus.FIXING),
    S.DONE: (DefectStatus.FIXING, DefectStatus.FIX_REVIEW),
}


def next_number() -> str:
    year = timezone.now().year
    count = WorkOrder.objects.filter(number__startswith=f"WO-{year}-").count() + 1
    return f"WO-{year}-{count:04d}"


@transaction.atomic
def transition(work_order: WorkOrder, target: str, request, reason: str = "") -> WorkOrder:
    user = request.user
    assert_transition(TRANSITIONS, work_order.status, target)

    roles = access.roles_for_building(user, work_order.building_id)
    allowed = roles & TARGET_ROLES.get(target, set())
    is_executor = target in EXECUTOR_TARGETS and work_order.responsible_id == user.pk
    if not allowed and not is_executor:
        raise PermissionDenied("У вашей роли нет права на этот переход.")
    if target in REASON_REQUIRED and not reason.strip():
        raise ValidationError({"reason": "Укажите причину."})
    if target == S.DONE and not work_order.files_exist():
        raise ValidationError({"files": "Приложите подтверждение выполнения (фото, акт)."})

    before = work_order.status
    work_order.status = target
    work_order.status_reason = reason
    if target == S.DONE:
        work_order.completed_at = timezone.now()
    if target == S.VERIFIED:
        work_order.verified_at = timezone.now()
        work_order.verified_by = user
    work_order.save()

    WorkOrderEvent.objects.create(
        work_order=work_order,
        from_status=before,
        to_status=target,
        actor=user,
        actor_role=",".join(sorted(roles)) or "executor",
        reason=reason,
    )
    log(
        AuditAction.WORK_ORDER_STATUS,
        work_order,
        request=request,
        changes={"from": before, "to": target, "reason": reason},
    )
    _sync_defect(work_order, target, request)
    return work_order


def _sync_defect(work_order: WorkOrder, target: str, request) -> None:
    defect = work_order.defect
    if defect is None:
        return
    if target in DEFECT_SYNC:
        expected, new = DEFECT_SYNC[target]
        if defect.status == expected:
            defect_services.change_status(defect, new, request, f"Мероприятие {work_order.number}")
    elif target == S.VERIFIED and defect.status == DefectStatus.FIX_REVIEW:
        defect_services.close(
            defect, request, f"Устранение проверено по мероприятию {work_order.number}"
        )
    elif target == S.IN_PROGRESS and defect.status == DefectStatus.FIX_REVIEW:
        defect_services.change_status(defect, DefectStatus.FIXING, request, "Возврат в работу")
