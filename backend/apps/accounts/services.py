from datetime import timedelta

from django.conf import settings
from django.contrib.sessions.models import Session
from django.core.mail import send_mail
from django.utils import timezone

from apps.audit.models import AuditAction
from apps.audit.services import log

from .models import LoginAttempt, OneTimeToken, User, UserSession


def is_locked_out(email: str) -> bool:
    window_start = timezone.now() - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    failed = LoginAttempt.objects.filter(
        email=email.lower(), succeeded=False, created_at__gte=window_start
    ).count()
    return failed >= settings.LOGIN_MAX_FAILED_ATTEMPTS


def record_attempt(email: str, ip: str | None, succeeded: bool) -> None:
    LoginAttempt.objects.create(email=email.lower(), ip_address=ip, succeeded=succeeded)


def track_session(request, user) -> None:
    UserSession.objects.update_or_create(
        session_key=request.session.session_key,
        defaults={
            "user": user,
            "ip_address": request.META.get("REMOTE_ADDR"),
            "user_agent": request.META.get("HTTP_USER_AGENT", "")[:512],
        },
    )


def revoke_sessions(user, *, request=None, except_key: str | None = None) -> int:
    sessions = UserSession.objects.filter(user=user, revoked_at__isnull=True)
    if except_key:
        sessions = sessions.exclude(session_key=except_key)
    keys = list(sessions.values_list("session_key", flat=True))
    sessions.update(revoked_at=timezone.now())
    Session.objects.filter(session_key__in=keys).delete()
    log(AuditAction.SESSION_REVOKED, user, request=request, changes={"count": len(keys)})
    return len(keys)


def send_invite(user: User, *, request=None) -> None:
    raw = OneTimeToken.issue(
        user, OneTimeToken.Purpose.INVITE, timedelta(hours=settings.INVITE_TOKEN_TTL_HOURS)
    )
    link = f"{settings.FRONTEND_URL}/invite/{raw}"
    send_mail(
        "Приглашение в Tirek",
        f"Вас пригласили в Tirek. Установите пароль по ссылке: {link}",
        None,
        [user.email],
    )
    log(AuditAction.USER_INVITED, user, request=request)


def send_password_reset(user: User) -> None:
    raw = OneTimeToken.issue(
        user,
        OneTimeToken.Purpose.PASSWORD_RESET,
        timedelta(minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES),
    )
    link = f"{settings.FRONTEND_URL}/reset-password/{raw}"
    send_mail(
        "Восстановление доступа к Tirek", f"Ссылка для сброса пароля: {link}", None, [user.email]
    )
