from django.contrib import admin

from .models import Defect, DefectEvent, DefectObservation


class ObservationInline(admin.TabularInline):
    model = DefectObservation
    extra = 0
    can_delete = False


@admin.register(Defect)
class DefectAdmin(admin.ModelAdmin):
    list_display = [
        "number",
        "building",
        "element",
        "status",
        "preliminary_severity",
        "current_risk",
    ]
    list_filter = ["status", "preliminary_severity"]
    search_fields = ["number", "description", "building__address"]
    inlines = [ObservationInline]


admin.site.register(DefectEvent)
