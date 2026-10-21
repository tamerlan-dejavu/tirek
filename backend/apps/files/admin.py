from django.contrib import admin

from .models import FileLink, StoredFile


@admin.register(StoredFile)
class StoredFileAdmin(admin.ModelAdmin):
    list_display = [
        "original_name",
        "kind",
        "content_type",
        "size",
        "building",
        "uploaded_by",
        "created_at",
    ]
    list_filter = ["kind", "content_type"]
    readonly_fields = ["sha256", "size", "content_type"]


admin.site.register(FileLink)
