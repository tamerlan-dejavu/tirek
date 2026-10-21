from django.contrib import admin

from .models import Notification, UrgentNotice

admin.site.register(Notification)
admin.site.register(UrgentNotice)
