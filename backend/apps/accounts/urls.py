from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf, name="auth-csrf"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("invite/accept/", views.SetPasswordView.as_view(), name="auth-invite-accept"),
    path("password-reset/", views.PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="auth-password-reset-confirm",
    ),
    path("sessions/", views.MySessionsView.as_view(), name="auth-sessions"),
    path("sessions/revoke-others/", views.revoke_other_sessions, name="auth-sessions-revoke"),
]
