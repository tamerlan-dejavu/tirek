from django.contrib import admin

from .models import Inspection, InspectionAnswer, InspectionReview


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ["number", "building", "status", "assignee", "approved_at", "published_at"]
    list_filter = ["status"]
    search_fields = ["number", "building__address"]


admin.site.register(InspectionAnswer)
admin.site.register(InspectionReview)
