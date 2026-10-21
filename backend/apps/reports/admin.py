from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["inspection", "version", "status", "generated_at", "published_at"]
    list_filter = ["status"]
    readonly_fields = ["snapshot", "sha256"]
