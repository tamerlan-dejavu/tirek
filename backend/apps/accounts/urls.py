from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="auth-csrf"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("demo/", views.demo_accounts, name="auth-demo"),
    path("demo/login/", views.DemoLoginView.as_view(), name="auth-demo-login"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("invite/accept/", views.SetPasswordView.as_view(), name="auth-invite-accept"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("mfa/setup/", views.MfaSetupView.as_view(), name="auth-mfa-setup"),
    path("mfa/enable/", views.MfaEnableView.as_view(), name="auth-mfa-enable"),
    path("mfa/disable/", views.MfaDisableView.as_view(), name="auth-mfa-disable"),
    path("sessions/", views.MySessionsView.as_view(), name="auth-sessions"),
    path("sessions/revoke-others/", views.revoke_other_sessions, name="auth-sessions-revoke"),
]
