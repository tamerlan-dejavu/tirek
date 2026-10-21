import base64
import hashlib

from celery import shared_task
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import log


def _embed_photos(snapshot: dict) -> dict:
    """Inline photos as data URIs so WeasyPrint never fetches anything over the network."""
    from apps.files.models import StoredFile

    ids = {p["file"] for a in snapshot["answers"] for p in a["photos"]}
    ids |= {p["file"] for d in snapshot["defects"] for p in d["photos"]}
    uris = {}
    for f in StoredFile.objects.filter(pk__in=ids):
        with f.file.open("rb") as fh:
            uris[str(f.pk)] = f"data:{f.content_type};base64,{base64.b64encode(fh.read()).decode()}"
    return uris


@shared_task
def generate_report(report_id: str) -> None:
    from weasyprint import HTML  # heavy import, only in the worker

    from apps.files.models import FileKind, StoredFile

    from .models import Report, ReportStatus

    report = Report.objects.select_related("inspection", "building", "generated_by").get(
        pk=report_id
    )
    Report.objects.filter(pk=report.pk).update(status=ReportStatus.GENERATING)
    try:
        html = render_to_string(
            "reports/inspection_report.html",
            {"s": report.snapshot, "report": report, "photos": _embed_photos(report.snapshot)},
        )
        pdf = HTML(string=html).write_pdf()
        digest = hashlib.sha256(pdf).hexdigest()
        stored = StoredFile(
            kind=FileKind.REPORT,
            original_name=f"{report.inspection.number}_v{report.version}.pdf",
            content_type="application/pdf",
            size=len(pdf),
            sha256=digest,
            building=report.building,
            organization=report.inspection.provider_organization,
            uploaded_by=report.generated_by,
        )
        stored.file.save("report", ContentFile(pdf), save=False)
        stored.save()
        Report.objects.filter(pk=report.pk).update(
            status=ReportStatus.READY, file=stored, sha256=digest, generated_at=timezone.now()
        )
        log(
            AuditAction.REPORT_GENERATED,
            report,
            actor=report.generated_by,
            building=report.building,
            changes={"version": report.version, "sha256": digest},
        )
    except Exception as exc:
        Report.objects.filter(pk=report.pk).update(
            status=ReportStatus.FAILED, error=str(exc)[:2000]
        )
        raise
