from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditAction
from apps.audit.services import log
from apps.inspections.models import Inspection, InspectionStatus

from .models import Report, ReportStatus
from .snapshot import build_snapshot
from .tasks import generate_report


@transaction.atomic
def request_report(inspection: Inspection, request) -> Report:
    """UC-08: a new numbered version from approved data only."""
    if inspection.status != InspectionStatus.APPROVED:
        raise ValidationError("Отчёт формируется только из утверждённого обследования.")
    version = (inspection.reports.aggregate(m=Max("version"))["m"] or 0) + 1
    report = Report.objects.create(
        inspection=inspection,
        building=inspection.building,
        version=version,
        snapshot=build_snapshot(inspection),
        generated_by=request.user,
    )
    transaction.on_commit(lambda: generate_report.delay(str(report.pk)))
    return report


@transaction.atomic
def publish(report: Report, request) -> Report:
    if report.status != ReportStatus.READY:
        raise ValidationError("Отчёт ещё не готов.")
    if report.inspection.published_at is None:
        raise ValidationError("Сначала опубликуйте обследование.")
    if report.published_at is None:
        Report.objects.filter(pk=report.pk).update(
            published_at=timezone.now(), published_by=request.user
        )
        report.refresh_from_db()
        log(AuditAction.PUBLISHED, report, request=request, building=report.building)
    return report
