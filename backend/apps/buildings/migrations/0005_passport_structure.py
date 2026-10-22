"""
Align the classifier with the digital passport structure and give every existing building
a full passport (all entries start as «неизвестно» — nothing is invented).
"""

from django.db import migrations

RENAMES = {
    "basement": "Подвальные помещения",
    "attic": "Чердак",
}
PASSPORT_GROUPS = ["structural", "engineering", "operational"]


def forwards(apps, schema_editor):
    ElementType = apps.get_model("buildings", "ElementType")
    Building = apps.get_model("buildings", "Building")
    Entry = apps.get_model("buildings", "BuildingPassportEntry")

    for code, name in RENAMES.items():
        ElementType.objects.filter(code=code).update(name=name)

    types = list(ElementType.objects.filter(group__in=PASSPORT_GROUPS, is_active=True))
    for building in Building.objects.all():
        have = set(Entry.objects.filter(building=building).values_list("element_type_id", flat=True))
        Entry.objects.bulk_create(
            [Entry(building=building, element_type=t) for t in types if t.code not in have]
        )


def backwards(apps, schema_editor):
    ElementType = apps.get_model("buildings", "ElementType")
    ElementType.objects.filter(code="basement").update(name="Подвалы")
    ElementType.objects.filter(code="attic").update(name="Чердаки")


class Migration(migrations.Migration):
    dependencies = [("buildings", "0004_passport_entries")]

    operations = [migrations.RunPython(forwards, backwards)]
