from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import LoginAttempt, User, UserSession


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ["email", "full_name", "is_active", "is_staff", "date_joined"]
    search_fields = ["email", "full_name"]
    fieldsets = [
        (None, {"fields": ["email", "password"]}),
        ("Профиль", {"fields": ["full_name", "phone", "position", "preferred_language"]}),
        ("Доступ", {"fields": ["is_active", "is_staff", "is_superuser", "mfa_enabled"]}),
    ]
    add_fieldsets = [(None, {"fields": ["email", "password1", "password2"]})]
    filter_horizontal = []
    list_filter = ["is_active", "is_staff"]


admin.site.register(UserSession)
admin.site.register(LoginAttempt)
