from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core import numbering
from apps.core.state_machine import assert_transition
from apps.defects import services as defect_services
from apps.defects.models import Defect
from apps.files.models import FileKind, FileLink
from apps.notifications.models import NotificationKind
from apps.notifications.services import notify
from apps.organizations.models import BuildingOrganizationLink, OrganizationMembership

from .models import (
    TRANSITIONS,
    RequestPriority,
    RequestStatus,
    ServiceRequest,
    ServiceRequestEvent,
)

R = RequestStatus
STATUS_TEXT = {
    R.ACCEPTED: "принята диспетчером",
    R.ASSIGNED: "передана исполнителю",
    R.IN_PROGRESS: "выполняется",
    R.DONE: "выполнена, ожидает проверки",
    R.VERIFIED: "проверена",
    R.CLOSED: "закрыта",
    R.REJECTED: "отклонена",
}


def next_number() -> str:
    return numbering.next_number(ServiceRequest, "REQ")


def _notify_author(req: ServiceRequest, title: str, body: str = "") -> None:
    if req.author_id:
        notify(
            [req.author],
            NotificationKind.SERVICE_REQUEST,
            title,
            body,
            building=req.building,
            link=f"/resident/requests/{req.pk}",
        )


@transaction.atomic
def change_status(req: ServiceRequest, target: str, request, comment: str = "") -> ServiceRequest:
    assert_transition(TRANSITIONS, req.status, target)
    before = req.status
    req.status = target
    req.save()
    ServiceRequestEvent.objects.create(
        request=req, from_status=before, to_status=target, actor=request.user, comment=comment
    )
    log(
        AuditAction.REQUEST_STATUS,
        req,
        request=request,
        changes={"from": before, "to": target, "comment": comment},
    )
    _notify_author(req, f"Заявка {req.number} {STATUS_TEXT.get(target, target)}", comment)
    return req


def note(req: ServiceRequest, request, comment: str) -> None:
    """Event without a status change (reassignment, priority, linked defect)."""
    ServiceRequestEvent.objects.create(
        request=req,
        from_status=req.status,
        to_status=req.status,
        actor=request.user,
        comment=comment,
    )


def has_result_photo(req: ServiceRequest) -> bool:
    """A result photo uploaded by staff (not by the resident who reported the problem)."""
    links = FileLink.objects.for_object(req).filter(file__kind=FileKind.REPAIR_PHOTO)
    if req.author_id:
        links = links.exclude(created_by_id=req.author_id)
    return links.exists()


def complete(req: ServiceRequest, request, resolution: str) -> ServiceRequest:
    """Executor marks the work done: what was done + a result photo (spec §11)."""
    if not resolution.strip():
        raise ValidationError({"text": "Опишите, что сделано."})
    if not has_result_photo(req):
        raise ValidationError({"files": "Приложите фото результата работ."})
    req.resolution = resolution
    return change_status(req, R.DONE, request, resolution)


def return_to_work(req: ServiceRequest, request, reason: str) -> ServiceRequest:
    if not reason.strip():
        raise ValidationError({"text": "Укажите, что не так с результатом."})
    return change_status(req, R.IN_PROGRESS, request, f"Возврат в работу: {reason}")


def default_priority(is_emergency: bool) -> str:
    return RequestPriority.URGENT if is_emergency else RequestPriority.NORMAL


def reject(req: ServiceRequest, request, reason: str) -> ServiceRequest:
    if not reason.strip():
        raise ValidationError({"reason": "Укажите причину для жителя."})
    req.resolution = reason
    return change_status(req, RequestStatus.REJECTED, request, reason)


@transaction.atomic
def confirm_emergency(req: ServiceRequest, request) -> ServiceRequest:
    """
    Dispatcher confirms an emergency: every organization linked to the building is notified
    at once and the fact is recorded. This does not replace calling emergency services.
    """
    if req.emergency_confirmed_at:
        return req
    req.emergency_confirmed_at = timezone.now()
    req.is_emergency = True
    req.priority = RequestPriority.URGENT
    req.save(update_fields=["emergency_confirmed_at", "is_emergency", "priority", "updated_at"])
    now = timezone.now()
    orgs = (
        BuildingOrganizationLink.objects.filter(building=req.building, valid_from__lte=now)
        .exclude(valid_to__lt=now)
        .values("organization_id")
    )
    users = [
        m.user
        for m in OrganizationMembership.objects.filter(
            organization_id__in=orgs, is_active=True, user__is_active=True
        )
        .exclude(role="resident")
        .select_related("user")
    ]
    notify(
        users,
        NotificationKind.EMERGENCY_REQUEST,
        f"Авария: {req.number} · {req.get_category_display()}",
        f"{req.building.address}. {req.description[:300]}",
        building=req.building,
        link=f"/requests/{req.pk}",
        email=True,
    )
    log(AuditAction.EMERGENCY_CONFIRMED, req, request=request, changes={"recipients": len(users)})
    _notify_author(
        req, f"Заявка {req.number}: авария подтверждена", "Ответственные службы оповещены."
    )
    return req


@transaction.atomic
def create_defect(req: ServiceRequest, request, element, defect_type: str) -> Defect:
    """Turn a resident signal into a defect; it then goes through engineering review."""
    if req.defect_id:
        raise ValidationError("По заявке уже создан дефект.")
    if element.building_id != req.building_id:
        raise ValidationError({"element": "Элемент другого здания."})
    location = ", ".join(
        p
        for p in (
            f"подъезд {req.entrance}" if req.entrance else "",
            f"этаж {req.floor}" if req.floor is not None else "",
            f"кв. {req.apartment}" if req.apartment else "",
            req.place,
        )
        if p
    )
    defect = Defect.objects.create(
        number=defect_services.next_number(),
        building=req.building,
        element=element,
        location=location[:255],
        defect_type=defect_type or req.get_category_display(),
        description=f"По заявке жителя {req.number}: {req.description}",
        created_by=request.user,
    )
    defect_services.send_to_review(defect, request, f"Из заявки {req.number}")
    req.defect = defect
    req.save(update_fields=["defect", "updated_at"])
    note(req, request, f"Создан дефект {defect.number} для инженерной проверки")
    return defect
