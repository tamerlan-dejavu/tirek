from django.contrib.auth import logout
from django.utils import timezone

from .models import UserSession


class SessionTrackingMiddleware:
    """Logs out revoked sessions and keeps `UserSession.last_seen_at` fresh."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, "user", None)
        key = request.session.session_key
        if user is not None and user.is_authenticated and key:
            tracked = UserSession.objects.filter(session_key=key).only("revoked_at").first()
            if tracked and tracked.revoked_at:
                logout(request)
            elif tracked:
                UserSession.objects.filter(pk=tracked.pk).update(last_seen_at=timezone.now())
        return self.get_response(request)
