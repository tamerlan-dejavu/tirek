"""Initial element classifier (ТЗ 5.4)."""

from django.db import migrations

ELEMENT_TYPES = [
    # (code, group, name)
    ("foundation", "structural", "Фундамент"),
    ("walls", "structural", "Стены"),
    ("columns", "structural", "Колонны"),
    ("beams", "structural", "Ригели"),
    ("slabs", "structural", "Перекрытия"),
    ("balconies", "structural", "Балконы"),
    ("facade", "structural", "Фасад"),
    ("roof", "structural", "Кровля"),
    ("electrical", "engineering", "Электроснабжение"),
    ("water", "engineering", "Водоснабжение"),
    ("sewerage", "engineering", "Канализация"),
    ("heating", "engineering", "Отопление"),
    ("heat_point", "engineering", "Тепловой пункт"),
    ("ventilation", "engineering", "Вентиляция"),
    ("gas", "engineering", "Газоснабжение"),
    ("fire_safety", "engineering", "Пожарная безопасность"),
    ("low_current", "engineering", "Слаботочные системы"),
    ("elevators", "operational", "Лифты"),
    ("basement", "operational", "Подвалы"),
    ("attic", "operational", "Чердаки"),
    ("parking", "operational", "Паркинг"),
    ("territory", "operational", "Придомовая территория"),
    # Locations used to build the hierarchy Дом → Подъезд №2 → Кровля → Участок
    ("entrance", "location", "Подъезд"),
    ("section", "location", "Секция"),
    ("area", "location", "Участок"),
]


def seed(apps, schema_editor):
    ElementType = apps.get_model("buildings", "ElementType")
    for order, (code, group, name) in enumerate(ELEMENT_TYPES):
        ElementType.objects.update_or_create(
            code=code, defaults={"group": group, "name": name, "sort_order": order}
        )


class Migration(migrations.Migration):
    dependencies = [("buildings", "0002_initial")]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
