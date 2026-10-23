from django.contrib import admin

from .models import MaintenanceRule, WorkOrder, WorkOrderComment, WorkOrderEvent


class EventInline(admin.TabularInline):
    model = WorkOrderEvent
    extra = 0
    can_delete = False
    readonly_fields = ["from_status", "to_status", "actor", "reason", "created_at"]


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["number", "title", "building", "priority", "status", "planned_date"]
    list_filter = ["status", "priority", "kind", "work_type"]
    search_fields = ["number", "title"]
    inlines = [EventInline]


admin.site.register(WorkOrderComment)


@admin.register(MaintenanceRule)
class MaintenanceRuleAdmin(admin.ModelAdmin):
    list_display = ["title", "element_type", "work_type", "periodicity", "is_active"]
    list_filter = ["work_type", "periodicity", "is_active"]
