"""Freeze everything a report shows at generation time (ТЗ 5.11)."""

from apps.defects.models import DefectStatus
from apps.files.models import FileLink
from apps.inspections.models import Inspection
from apps.workorders.models import WorkOrder


def _photos(obj) -> list[dict]:
    return [
        {"file": str(link.file_id), "caption": link.file.caption, "name": link.file.original_name}
        for link in FileLink.objects.for_object(obj).select_related("file")
        if link.file.content_type.startswith("image/")
    ]


def build_snapshot(inspection: Inspection) -> dict:
    b = inspection.building
    answers = inspection.answers.select_related("item", "item__element_type", "element")
    defects = inspection.defects.select_related("element", "current_risk__engineer")
    return {
        "building": {
            "internal_code": b.internal_code,
            "name": b.name,
            "address": b.address,
            "city": b.city,
            "year_built": b.year_built,
            "floors": b.floors,
            "entrances": b.entrances,
            "apartments": b.apartments,
            "total_area_m2": str(b.total_area_m2) if b.total_area_m2 is not None else None,
            "structural_scheme": b.get_structural_scheme_display(),
        },
        "inspection": {
            "number": inspection.number,
            "version": inspection.version,
            "type": inspection.get_inspection_type_display(),
            "performed_at": inspection.performed_at.isoformat()
            if inspection.performed_at
            else None,
            "assignee": str(inspection.assignee),
            "reviewer": str(inspection.approved_by) if inspection.approved_by else None,
            "reviewer_position": inspection.approved_by.position if inspection.approved_by else "",
            "approved_at": inspection.approved_at.isoformat() if inspection.approved_at else None,
            "scope_and_limitations": inspection.scope_and_limitations,
            "summary": inspection.summary,
            "checklist": str(inspection.template_version),
            "correction_reason": inspection.correction_reason,
        },
        "answers": [
            {
                "code": a.item.code,
                "text": a.item.text,
                "group": a.item.element_type.name if a.item.element_type else "",
                "element": a.element.name if a.element else "",
                "compliance": a.get_compliance_display() if a.compliance else "",
                "value": (
                    f"{a.number_value} {a.item.unit}".strip()
                    if a.number_value is not None
                    else a.text_value
                    or a.choice_value
                    or (a.date_value.isoformat() if a.date_value else "")
                ),
                "comment": a.comment,
                "photos": _photos(a),
            }
            for a in answers
        ],
        "defects": [
            {
                "number": d.number,
                "element_path": " → ".join(d.element.path),
                "location": d.location,
                "type": d.defect_type,
                "category": d.category.name if d.category_id else "",
                "priority": d.get_priority_display() if d.priority else "",
                "description": d.description,
                "detected_on": d.detected_on.isoformat(),
                # Preliminary vs approved are kept distinct (ТЗ 5.11, 9.7)
                "preliminary_severity": d.preliminary_severity,
                "approved": d.current_risk is not None,
                "risk": d.current_risk.category if d.current_risk else None,
                "risk_justification": d.current_risk.justification if d.current_risk else "",
                "risk_engineer": str(d.current_risk.engineer) if d.current_risk else "",
                "recommendations": d.recommendations,
                "observations": [
                    {
                        "date": o.observed_on.isoformat(),
                        "description": o.description,
                        "trend": o.trend,
                    }
                    for o in d.observations.all()
                ],
                "photos": _photos(d),
            }
            for d in defects
            if d.status != DefectStatus.REJECTED
        ],
        "work_plan": [
            {
                "number": w.number,
                "title": w.title,
                "priority": w.get_priority_display(),
                "recommended_date": w.recommended_date.isoformat() if w.recommended_date else None,
                "status": w.get_status_display(),
                "defect": w.defect.number if w.defect else None,
            }
            for w in WorkOrder.objects.filter(defect__inspection=inspection).select_related(
                "defect"
            )
        ],
    }
