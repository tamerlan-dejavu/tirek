from django.contrib import admin

from .models import Poll, PollOption, ServiceRequest, ServiceRequestEvent


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = [
        "number",
        "building",
        "category",
        "status",
        "is_emergency",
        "assignee",
        "created_at",
    ]
    list_filter = ["status", "category", "is_emergency"]
    search_fields = ["number", "description"]


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 0


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ["question", "building", "is_published", "closes_at"]
    inlines = [PollOptionInline]


admin.site.register(ServiceRequestEvent)
