from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin

from .models import Building, BuildingDocument, BuildingElement, ElementType


@admin.register(Building)
class BuildingAdmin(SimpleHistoryAdmin):
    list_display = ["internal_code", "address", "year_built", "floors", "structural_scheme"]
    search_fields = ["internal_code", "address", "name"]


@admin.register(ElementType)
class ElementTypeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "group", "sort_order", "is_active"]
    list_filter = ["group"]


@admin.register(BuildingElement)
class BuildingElementAdmin(SimpleHistoryAdmin):
    list_display = ["name", "building", "element_type", "parent"]
    list_filter = ["element_type__group"]


admin.site.register(BuildingDocument)
