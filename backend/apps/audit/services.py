from .models import AuditEvent


def _client_ip(request):
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    return forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")


def log(
    action: str,
    obj=None,
    *,
    actor=None,
    request=None,
    building=None,
    organization=None,
    changes: dict | None = None,
) -> AuditEvent:
    """Record an audit event. Call inside the same transaction as the change itself."""
    if actor is None and request is not None and request.user.is_authenticated:
        actor = request.user
    if building is None and obj is not None:
        is_building = obj._meta.label == "buildings.Building"
        building = obj if is_building else getattr(obj, "building", None)
    return AuditEvent.objects.create(
        actor=actor,
        organization=organization,
        building=building,
        action=action,
        object_type=type(obj).__name__ if obj is not None else "",
        object_id=str(obj.pk) if obj is not None else "",
        changes=changes or {},
        ip_address=_client_ip(request),
    )
