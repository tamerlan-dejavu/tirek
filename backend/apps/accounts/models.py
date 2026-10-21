import hashlib
import secrets
import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import UUIDModel


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # set later via one-time invite link
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.update(is_staff=True, is_superuser=True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Platform user. Roles live in organization memberships, not on the user (ТЗ 4.3)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    position = models.CharField("Должность", max_length=255, blank=True)
    is_active = models.BooleanField(default=True)  # False = blocked
    is_staff = models.BooleanField(default=False)
    mfa_enabled = models.BooleanField(default=False)
    preferred_language = models.CharField(max_length=8, default="ru")
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self):
        return self.full_name or self.email


class UserSession(UUIDModel):
    """Mirror of Django sessions so a user/admin can list and revoke active sessions."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tracked_sessions")
    session_key = models.CharField(max_length=40, unique=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    last_seen_at = models.DateTimeField(default=timezone.now)
    revoked_at = models.DateTimeField(null=True, blank=True)


class LoginAttempt(models.Model):
    email = models.EmailField(db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    succeeded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.email} {'ok' if self.succeeded else 'fail'}"


class OneTimeToken(UUIDModel):
    """Invite / password-reset token. Only the SHA-256 hash is stored."""

    class Purpose(models.TextChoices):
        INVITE = "invite", "Приглашение"
        PASSWORD_RESET = "password_reset", "Восстановление пароля"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="one_time_tokens")
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    @staticmethod
    def hash(raw: str) -> str:
        return hashlib.sha256(raw.encode()).hexdigest()

    @classmethod
    def issue(cls, user, purpose, ttl) -> str:
        raw = secrets.token_urlsafe(32)
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(
            used_at=timezone.now()
        )
        cls.objects.create(
            user=user, purpose=purpose, token_hash=cls.hash(raw), expires_at=timezone.now() + ttl
        )
        return raw

    @classmethod
    def consume(cls, raw: str, purpose) -> "OneTimeToken | None":
        token = (
            cls.objects.select_for_update()
            .filter(
                token_hash=cls.hash(raw),
                purpose=purpose,
                used_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
            .first()
        )
        if token:
            token.used_at = timezone.now()
            token.save(update_fields=["used_at"])
        return token
