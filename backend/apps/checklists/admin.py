from django.contrib import admin

from .models import ChecklistItem, ChecklistTemplate, ChecklistTemplateVersion


class ItemInline(admin.TabularInline):
    model = ChecklistItem
    extra = 0


@admin.register(ChecklistTemplateVersion)
class VersionAdmin(admin.ModelAdmin):
    list_display = ["template", "number", "status", "published_at"]
    inlines = [ItemInline]


admin.site.register(ChecklistTemplate)
