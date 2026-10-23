"""Base settings shared by every environment. Secrets come only from the environment (ТЗ 9.4)."""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / ".env", overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "drf_spectacular",
    "django_filters",
    "corsheaders",
    "simple_history",
    # Tirek modules (ТЗ 3.1)
    "apps.core",
    "apps.accounts",  # M01
    "apps.organizations",  # M02
    "apps.buildings",  # M03, M04
    "apps.checklists",  # M05 — templates
    "apps.inspections",  # M05 — inspections
    "apps.defects",  # M06
    "apps.risks",  # M07
    "apps.workorders",  # M08
    "apps.files",  # M09
    "apps.portal",  # M10
    "apps.reports",  # M11
    "apps.audit",  # M12 — journal
    "apps.analytics",  # M12 — metrics
    "apps.notifications",
    "apps.service_requests",  # resident requests and polls (beyond MVP 1.0 scope)
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.accounts.middleware.SessionTrackingMiddleware",
    "apps.core.middleware.IdempotencyMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["ATOMIC_REQUESTS"] = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "accounts.User"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",  # Argon2id (ТЗ 5.1)
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Sessions & CSRF: HTTP-only cookies (ТЗ 5.1, 9.1)
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 12
CSRF_COOKIE_HTTPONLY = False  # the frontend reads it to send X-CSRFToken
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# Brute-force protection (ТЗ 5.1)
LOGIN_MAX_FAILED_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15
INVITE_TOKEN_TTL_HOURS = 72
PASSWORD_RESET_TOKEN_TTL_MINUTES = 30

LANGUAGE_CODE = "ru"
LANGUAGES = [("ru", "Русский"), ("kk", "Қазақша")]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "Asia/Almaty"  # display only; storage is UTC (ТЗ 7.2)
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Private file storage (ТЗ 5.9, 7.2): never a public URL.
#   s3         — S3-compatible bucket, short-lived signed links (production)
#   filesystem — private directory outside any web root, streamed by the backend (local dev)
STORAGE_BACKEND = env("STORAGE_BACKEND", default="s3")
S3_SIGNED_URL_TTL = env.int("S3_SIGNED_URL_TTL", default=300)
if STORAGE_BACKEND == "filesystem":
    _default_storage = {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
        "OPTIONS": {"location": env("PRIVATE_MEDIA_ROOT", default=str(BASE_DIR / "private_media"))},
    }
else:
    _default_storage = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "endpoint_url": env("S3_ENDPOINT_URL", default=None),
            "access_key": env("S3_ACCESS_KEY", default=None),
            "secret_key": env("S3_SECRET_KEY", default=None),
            "bucket_name": env("S3_BUCKET", default="tirek-private"),
            "region_name": env("S3_REGION", default="us-east-1"),
            "default_acl": "private",
            "querystring_auth": True,
            "querystring_expire": S3_SIGNED_URL_TTL,
            "file_overwrite": False,
        },
    }
STORAGES = {
    "default": _default_storage,
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
# "redirect" → signed storage URL; "proxy" → the backend streams the file
FILE_DOWNLOAD_MODE = env(
    "FILE_DOWNLOAD_MODE", default="proxy" if STORAGE_BACKEND == "filesystem" else "redirect"
)

MAX_UPLOAD_SIZE_MB = env.int("MAX_UPLOAD_SIZE_MB", default=25)
MAX_VIDEO_UPLOAD_MB = env.int("MAX_VIDEO_UPLOAD_MB", default=100)
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024  # JSON bodies (ТЗ 9.3)
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
# Final list is fixed after the pilot equipment check (ТЗ 5.9)
ALLOWED_UPLOAD_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/quicktime",
    "video/webm",
]

# Demo stand: role picker with password-less login into the fixed demo accounts
# (apps/accounts/demo.py). NEVER enable on an instance with real users or data.
DEMO_MODE = env.bool("DEMO_MODE", default=False)

vars().update(env.email_url("EMAIL_URL", default="consolemail://"))
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Tirek <no-reply@tirek.local>")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_TASK_ALWAYS_EAGER = False

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.DefaultPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "password_reset": "5/hour",
        "sensitive": "30/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Tirek API",
    "DESCRIPTION": "Цифровая платформа инженерного сопровождения жилых зданий — MVP 1.0",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
