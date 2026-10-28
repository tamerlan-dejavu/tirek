"""
Classifier by building type (ТЗ 5.4, ред. 1.1): the preliminary list of commercial-building
elements and location levels, and the building types every element applies to. Existing buildings get the new passport lines as «неизвестно».
"""

from django.db import migrations

RES = "residential"
COMMERCIAL = ["business_center", "mall", "hotel", "other_commercial"]
PRELIMINARY = "Предварительный перечень — на согласование с инженерами"

NEW = [
    # code, group, name, sort_order, building types ([] = all), note
    ("escalators", "operational", "Эскалаторы и пассажирские конвейеры", 15, COMMERCIAL, PRELIMINARY),
    ("hvac", "engineering", "Кондиционирование и климатические системы", 55, COMMERCIAL, PRELIMINARY),
    ("smoke_control", "engineering", "Дымоудаление и противопожарные системы", 75, COMMERCIAL, PRELIMINARY),
    ("access_control", "engineering", "Контроль доступа и видеонаблюдение", 85, COMMERCIAL, PRELIMINARY),
    ("public_areas", "operational", "Зоны общего пользования и эвакуационные пути", 55, COMMERCIAL, PRELIMINARY),
    ("tech_premises", "operational", "Технологические и кухонные помещения", 65, ["mall", "hotel"], PRELIMINARY),
    # Location levels of a commercial building: Здание → Блок → Этаж/зона → Помещение
    ("block", "location", "Блок / корпус", 5, COMMERCIAL, ""),
    ("zone", "location", "Зона", 25, COMMERCIAL, ""),
    ("premise", "location", "Помещение", 35, COMMERCIAL, ""),
]
# Existing elements that do not apply to every type
SCOPE = {
    "entrance": [RES],
    "balconies": [RES, "hotel"],
}
PASSPORT_GROUPS = ["structural", "engineering", "operational"]


def forwards(apps, schema_editor):
    ElementType = apps.get_model("buildings", "ElementType")
    Building = apps.get_model("buildings", "Building")
    Entry = apps.get_model("buildings", "BuildingPassportEntry")
    for code, group, name, order, types, note in NEW:
        ElementType.objects.update_or_create(
            code=code,
            defaults={"group": group, "name": name, "sort_order": order,
                      "building_types": types, "note": note},
        )
    for code, types in SCOPE.items():
        ElementType.objects.filter(code=code).update(building_types=types)

    types = list(ElementType.objects.filter(group__in=PASSPORT_GROUPS, is_active=True))
    for building in Building.objects.all():
        have = set(Entry.objects.filter(building=building).values_list("element_type_id", flat=True))
        Entry.objects.bulk_create([
            Entry(building=building, element_type=t)
            for t in types
            if t.code not in have and (not t.building_types or building.building_type in t.building_types)
        ])


class Migration(migrations.Migration):
    dependencies = [("buildings", "0006_building_types")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
