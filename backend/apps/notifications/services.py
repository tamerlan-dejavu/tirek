from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.organizations.models import BuildingOrganizationLink, OrganizationMembership

from .models import Notification, NotificationKind, UrgentNotice
from .tasks import send_notification_email


def notify(users, kind, title, body="", building=None, link="", email=False):
    created = [
        Notification.objects.create(
            recipient=u, kind=kind, title=title, body=body, building=building, link=link
        )
        for u in users
    ]
    if email:
        ids = [str(n.pk) for n in created]
        transaction.on_commit(lambda: [send_notification_email.delay(i) for i in ids])
    return created


def notify_urgent_defect(defect, assessment, *, request):
    """Immediately notify every organization linked to the building and record the fact."""
    now = timezone.now()
    links = (
        BuildingOrganizationLink.objects.filter(building=defect.building, valid_from__lte=now)
        .exclude(valid_to__lt=now)
        .select_related("organization")
    )
    message = (
        f"{defect.building.address}: дефект {defect.number} ({defect.defect_type}) "
        f"оценён как {assessment.get_category_display()}. {assessment.hazard_description}"
    )
    for link in links:
        users = [
            m.user
            for m in OrganizationMembership.objects.filter(
                organization=link.organization, is_active=True, user__is_active=True
            ).select_related("user")
        ]
        notice = UrgentNotice.objects.create(
            defect=defect, organization=link.organization, message=message, sent_by=request.user
        )
        notice.recipients.set(users)
        notify(
            users,
            NotificationKind.URGENT_DEFECT,
            f"Срочно: {defect.number}",
            message,
            building=defect.building,
            link=f"/defects/{defect.pk}",
            email=True,
        )
        log(
            AuditAction.URGENT_NOTICE,
            defect,
            request=request,
            organization=link.organization,
            changes={"notice": str(notice.pk), "recipients": len(users)},
        )
