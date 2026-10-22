from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.audit.models import AuditAction
from apps.audit.services import log

from . import demo, services
from .models import OneTimeToken, User, UserSession
from .serializers import (
    LoginSerializer,
    MeSerializer,
    PasswordResetRequestSerializer,
    SetPasswordSerializer,
    UserSessionSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf(request):
    """Sets the CSRF cookie for the SPA before the first mutating request."""
    return Response(status=status.HTTP_204_NO_CONTENT)


# Not atomic: a failed attempt must be recorded even though the response is an error,
# otherwise ATOMIC_REQUESTS rolls it back and the lockout never triggers.
@method_decorator(transaction.non_atomic_requests, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        email = data.validated_data["email"].lower()
        ip = request.META.get("REMOTE_ADDR")

        if services.is_locked_out(email):
            return Response(
                {"error": {"code": "locked", "detail": "Слишком много попыток. Попробуйте позже."}},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(request, email=email, password=data.validated_data["password"])
        services.record_attempt(email, ip, succeeded=user is not None)
        if user is None:
            log(AuditAction.LOGIN_FAILED, request=request, changes={"email": email})
            # Returned, not raised: DRF rolls back the transaction on exceptions
            return Response(
                {"error": {"code": "invalid_credentials", "detail": "Неверный email или пароль."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        services.track_session(request, user)
        log(AuditAction.LOGIN, user, actor=user, request=request)
        return Response(MeSerializer(user).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def demo_accounts(request):
    """Role picker for the demo stand. Empty and disabled unless DEMO_MODE is on."""
    if not settings.DEMO_MODE:
        return Response({"enabled": False, "accounts": []})
    existing = set(User.objects.filter(is_active=True).values_list("email", flat=True))
    return Response(
        {"enabled": True, "accounts": [a for a in demo.public_list() if a["email"] in existing]}
    )


class DemoLoginView(APIView):
    """Password-less login into a FIXED demo account. Disabled (404) outside DEMO_MODE."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        if not settings.DEMO_MODE:
            raise NotFound()
        account = demo.BY_KEY.get(str(request.data.get("key", "")))
        if account is None:
            raise ValidationError({"key": "Неизвестная демо-роль."})
        user = User.objects.filter(email=account.email, is_active=True).first()
        if user is None:
            raise ValidationError({"key": "Демо-данные не загружены: выполните seed_demo."})
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        services.track_session(request, user)
        log(
            AuditAction.LOGIN, user, actor=user, request=request, changes={"demo_role": account.key}
        )
        return Response({**MeSerializer(user).data, "home": account.home})


class LogoutView(APIView):
    def post(self, request):
        UserSession.objects.filter(session_key=request.session.session_key).delete()
        log(AuditAction.LOGOUT, request.user, request=request)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class SetPasswordView(APIView):
    """Completes an invite or a password reset using a one-time token."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"
    purpose = OneTimeToken.Purpose.INVITE

    def post(self, request):
        data = SetPasswordSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        token = OneTimeToken.consume(data.validated_data["token"], self.purpose)
        if token is None:
            raise ValidationError({"token": "Ссылка недействительна или устарела."})
        user = token.user
        user.set_password(data.validated_data["password"])
        user.save(update_fields=["password"])
        services.revoke_sessions(user, request=request)
        log(AuditAction.PASSWORD_RESET, user, actor=user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetConfirmView(SetPasswordView):
    purpose = OneTimeToken.Purpose.PASSWORD_RESET


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        data = PasswordResetRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.filter(
            email=data.validated_data["email"].lower(), is_active=True
        ).first()
        if user:
            services.send_password_reset(user)
        # Same answer whether or not the account exists
        return Response(status=status.HTTP_202_ACCEPTED)


class MySessionsView(generics.ListAPIView):
    serializer_class = UserSessionSerializer
    pagination_class = None

    def get_queryset(self):
        return UserSession.objects.filter(user=self.request.user, revoked_at__isnull=True)


@api_view(["POST"])
@throttle_classes([])
def revoke_other_sessions(request):
    count = services.revoke_sessions(
        request.user, request=request, except_key=request.session.session_key
    )
    return Response({"revoked": count})
