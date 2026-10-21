from django.contrib import admin

from .models import (
    BuildingAssignment,
    BuildingOrganizationLink,
    Organization,
    OrganizationMembership,
)


class MembershipInline(admin.TabularInline):
    model = OrganizationMembership
    fk_name = "organization"
    extra = 0
    exclude = ["created_by"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "bin", "is_active"]
    list_filter = ["type", "is_active"]
    search_fields = ["name", "bin"]
    inlines = [MembershipInline]


@admin.register(BuildingOrganizationLink)
class BuildingOrganizationLinkAdmin(admin.ModelAdmin):
    list_display = ["building", "organization", "function", "valid_from", "valid_to"]
    list_filter = ["function"]


admin.site.register(BuildingAssignment)
