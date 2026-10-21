import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import OneTimeToken, User

from .conftest import client_for

pytestmark = pytest.mark.django_db


def test_login_lockout_after_failed_attempts(settings):
    User.objects.create_user(email="u@test.kz", password="correct-horse-1")
    api = APIClient()
    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS):
        assert (
            api.post("/api/v1/auth/login/", {"email": "u@test.kz", "password": "bad"}).status_code
            == 400
        )
    r = api.post("/api/v1/auth/login/", {"email": "u@test.kz", "password": "correct-horse-1"})
    assert r.status_code == 429


def test_invite_flow_sets_password_once(world):
    r = client_for(world.admin_a).post(
        f"/api/v1/organizations/{world.org_a.pk}/invite/",
        {"email": "new@a.test", "role": "field_specialist"},
        format="json",
    )
    assert r.status_code == 201, r.content
    assert len(mail.outbox) == 1
    raw = mail.outbox[0].body.rsplit("/", 1)[-1].strip()

    api = APIClient()
    body = {"token": raw, "password": "Very-Strong-Pass-2026"}
    assert api.post("/api/v1/auth/invite/accept/", body).status_code == 204
    assert api.post("/api/v1/auth/invite/accept/", body).status_code == 400  # one-time
    assert not OneTimeToken.objects.filter(token_hash=raw).exists()  # only hash stored
    assert (
        api.post(
            "/api/v1/auth/login/", {"email": "new@a.test", "password": "Very-Strong-Pass-2026"}
        ).status_code
        == 200
    )


def test_foreign_admin_cannot_invite_into_org(world):
    r = client_for(world.admin_b).post(
        f"/api/v1/organizations/{world.org_a.pk}/invite/",
        {"email": "x@x.test", "role": "provider_admin"},
        format="json",
    )
    assert r.status_code in (403, 404)


def test_blocked_user_cannot_log_in(world):
    world.field_a.is_active = False
    world.field_a.save()
    r = APIClient().post(
        "/api/v1/auth/login/", {"email": "field@a.test", "password": "x-test-password-1"}
    )
    assert r.status_code == 400
