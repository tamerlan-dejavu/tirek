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


@pytest.mark.parametrize(
    "url",
    [
        "/api/v1/auth/login/",
        "/api/v1/auth/password-reset/",
        "/api/v1/auth/demo/login/",
        "/api/v1/auth/invite/accept/",
    ],
)
def test_anonymous_posts_require_csrf_token(url, world, settings):
    """«Login CSRF»: a cross-site form must not be able to log the victim in (or reset)."""
    settings.DEMO_MODE = True
    api = APIClient(enforce_csrf_checks=True)
    assert api.post(url, {"email": "x@y.z", "key": "engineer"}, format="json").status_code == 403
    api.get("/api/v1/auth/csrf/")
    token = api.cookies["csrftoken"].value
    r = api.post(url, {"email": "x@y.z", "key": "engineer"}, format="json", HTTP_X_CSRFTOKEN=token)
    assert r.status_code != 403


def test_optional_features_off_by_default(world, settings):
    """ТЗ 5.7 (no unapproved formula) and 3.2 (no residents' voting): off unless enabled."""
    settings.FEATURE_RISK_SCORING = False
    settings.FEATURE_POLLS = False
    api = client_for(world.engineer_a)
    assert api.get("/api/v1/features/").json() == {"risk_scoring": False, "polls": False}
    assert api.get("/api/v1/risk-assessments/methodology/").status_code == 404
    assert client_for(world.osi_rep).get("/api/v1/polls/").status_code == 404


def test_audit_journal_for_admin_only(world):
    client_for(world.admin_a).patch(
        f"/api/v1/buildings/{world.building.pk}/", {"floors": 9}, format="json"
    )
    rows = client_for(world.admin_a).get("/api/v1/audit-events/?action=building.changed").json()
    assert rows["count"] >= 1
    first = rows["results"][0]
    assert first["action_label"] == "Изменение паспорта"
    assert first["building_address"] == world.building.address
    assert client_for(world.engineer_a).get("/api/v1/audit-events/").json()["count"] == 0
    assert client_for(world.admin_b).get("/api/v1/audit-events/").json()["count"] == 0


def test_audit_journal_shows_logins_of_own_staff(world):
    APIClient().post(
        "/api/v1/auth/login/",
        {"email": "field@a.test", "password": "x-test-password-1"},
        format="json",
    )
    own = client_for(world.admin_a).get("/api/v1/audit-events/?action=auth.login").json()
    assert any(r["actor_email"] == "field@a.test" for r in own["results"])
    other = client_for(world.admin_b).get("/api/v1/audit-events/?action=auth.login").json()
    assert not any(r["actor_email"] == "field@a.test" for r in other["results"])


def test_mfa_enrolment_and_login(world):
    """ТЗ 5.1, 9.1: TOTP second factor for privileged users."""
    import pyotp

    api = client_for(world.admin_a)
    setup = api.post("/api/v1/auth/mfa/setup/").json()
    assert setup["uri"].startswith("otpauth://totp/") and "<svg" in setup["qr_svg"]
    totp = pyotp.TOTP(setup["secret"])
    assert api.post("/api/v1/auth/mfa/enable/", {"code": "000000"}).status_code == 400
    assert api.post("/api/v1/auth/mfa/enable/", {"code": totp.now()}).json()["mfa_enabled"]
    assert "mfa_secret" not in api.get("/api/v1/auth/me/").json()

    anon = APIClient()
    creds = {"email": "admin@a.test", "password": "x-test-password-1"}
    r = anon.post("/api/v1/auth/login/", creds, format="json")
    assert r.status_code == 400 and r.json()["error"]["code"] == "mfa_required"
    r = anon.post("/api/v1/auth/login/", {**creds, "otp": "123456"}, format="json")
    assert r.json()["error"]["code"] == "invalid_otp"
    r = anon.post("/api/v1/auth/login/", {**creds, "otp": totp.now()}, format="json")
    assert r.status_code == 200, r.content
    # a wrong password never reaches the second factor
    r = anon.post(
        "/api/v1/auth/login/", {**creds, "password": "bad", "otp": totp.now()}, format="json"
    )
    assert r.json()["error"]["code"] == "invalid_credentials"
    assert (
        api.post("/api/v1/auth/mfa/disable/", {"code": totp.now()}).json()["mfa_enabled"] is False
    )


def test_request_submission_is_rate_limited(world, monkeypatch):
    from django.core.cache import cache
    from rest_framework.throttling import ScopedRateThrottle

    from apps.organizations.models import OrganizationMembership, Role

    resident = User.objects.create_user(email="res@a.test", password="x-test-password-1")
    OrganizationMembership.objects.create(user=resident, organization=world.osi, role=Role.RESIDENT)
    # DRF binds the rates when the throttle class is imported: patch them directly
    rates = {**ScopedRateThrottle.THROTTLE_RATES, "service_request": "2/hour"}
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", rates)
    cache.clear()
    api = client_for(resident)
    body = {
        "building": str(world.building.pk),
        "category": "leak",
        "description": "Капает с потолка",
    }
    codes = [
        api.post("/api/v1/service-requests/", body, format="json").status_code for _ in range(3)
    ]
    assert codes == [201, 201, 429]
    assert api.get("/api/v1/service-requests/").status_code == 200  # reading is not limited
