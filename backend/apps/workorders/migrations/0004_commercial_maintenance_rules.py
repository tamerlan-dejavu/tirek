"""Typical ППР for the systems of commercial buildings (working proposal, to be approved)."""

from django.db import migrations

NOTE = "Типовой регламент — требует утверждения"
RULES = [
    # element, work_type, title, periodicity, months, labor_hours
    ("escalators", "maintenance", "ТО эскалаторов и траволаторов (специализированная организация)", "monthly", list(range(1, 13)), None),
    ("hvac", "preparation", "Подготовка систем кондиционирования к сезону охлаждения", "annual", [4], "16"),
    ("hvac", "cleaning", "Очистка и дезинфекция фильтров и дренажа кондиционеров", "quarterly", [1, 4, 7, 10], "8"),
    ("smoke_control", "testing", "Проверка клапанов и вентиляторов дымоудаления", "semiannual", [3, 9], "6"),
    ("access_control", "inspection", "Осмотр СКУД и видеонаблюдения", "quarterly", [2, 5, 8, 11], "3"),
    ("public_areas", "inspection", "Осмотр эвакуационных путей, указателей и аварийного освещения", "monthly", list(range(1, 13)), "2"),
]


def forwards(apps, schema_editor):
    Rule = apps.get_model("workorders", "MaintenanceRule")
    for element, work_type, title, periodicity, months, hours in RULES:
        Rule.objects.get_or_create(
            element_type_id=element,
            title=title,
            defaults={"work_type": work_type, "periodicity": periodicity, "months": months,
                      "labor_hours": hours, "note": NOTE},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("workorders", "0003_seed_maintenance_rules"),
        ("buildings", "0007_classifier_by_building_type"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
