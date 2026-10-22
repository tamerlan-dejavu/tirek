"""
Move existing requests to the 7-status dispatcher workflow (spec §11).
«Решена» becomes «Закрыта»; an assigned request that was «В работе» stays «Выполняется».
Source and priority are back-filled from the data already stored.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    Request = apps.get_model("service_requests", "ServiceRequest")
    Event = apps.get_model("service_requests", "ServiceRequestEvent")
    Request.objects.filter(status="resolved").update(status="closed")
    Event.objects.filter(to_status="resolved").update(to_status="closed")
    Event.objects.filter(from_status="resolved").update(from_status="closed")
    Request.objects.filter(author__isnull=True).update(source="dispatcher")
    Request.objects.filter(is_emergency=True).update(priority="urgent")


class Migration(migrations.Migration):
    dependencies = [("service_requests", "0002_dispatch_workflow")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
