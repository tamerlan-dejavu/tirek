from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.core.state_machine import assert_transition
from apps.defects import services as defect_services
from apps.defects.models import Defect
from apps.notifications.models import NotificationKind
from apps.notifications.services import notify
from apps.organizations.models import BuildingOrganizationLink, OrganizationMembership

from .models import TRANSITIONS, RequestStatus, ServiceRequest, ServiceRequestEvent

STATUS_TEXT = {
    RequestStatus.ACCEPTED: "принята диспетчером",
    RequestStatus.IN_PROGRESS: "передана в работу",
    RequestStatus.RESOLVED: "решена",
    RequestStatus.REJECTED: "отклонена",
}


def next_number() -> str:
    year = timezone.now().year
    count = ServiceRequest.objects.filter(number__startswith=f"REQ-{year}-").count() + 1
    return f"REQ-{year}-{count:04d}"


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


def resolve(req: ServiceRequest, request, resolution: str) -> ServiceRequest:
    if not resolution.strip():
        raise ValidationError({"resolution": "Опишите, что сделано."})
    req.resolution = resolution
    return change_status(req, RequestStatus.RESOLVED, request, resolution)


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
    req.save(update_fields=["emergency_confirmed_at", "is_emergency", "updated_at"])
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
    req.defect = defect
    req.save(update_fields=["defect", "updated_at"])
    ServiceRequestEvent.objects.create(
        request=req,
        from_status=req.status,
        to_status=req.status,
        actor=request.user,
        comment=f"Создан дефект {defect.number} для инженерной проверки",
    )
    return defect
