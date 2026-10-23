"""Typical preventive maintenance regulation (working proposal, to be approved)."""

from django.db import migrations

RULES = [
    # element, work_type, title, periodicity, months, labor_hours, materials
    ("roof", "inspection", "Осмотр кровли, водостоков и парапетов", "semiannual", [4, 10], "2", ""),
    ("roof", "cleaning", "Очистка кровли и водосточных воронок", "semiannual", [5, 11], "4", "Мешки для мусора"),
    ("facade", "inspection", "Осмотр фасада, балконов и межпанельных швов", "annual", [5], "4", ""),
    ("heating", "preparation", "Подготовка системы отопления к сезону: промывка и опрессовка", "annual", [8], "16", "Реагенты для промывки, уплотнители"),
    ("heat_point", "maintenance", "Техническое обслуживание и поверка приборов ИТП", "annual", [8], "8", ""),
    ("water", "inspection", "Осмотр стояков и запорной арматуры ХВС и ГВС", "semiannual", [3, 9], "3", ""),
    ("sewerage", "cleaning", "Прочистка выпусков и лежаков канализации", "annual", [6], "6", ""),
    ("electrical", "testing", "Осмотр ВРУ и этажных щитов, замеры сопротивления изоляции", "annual", [7], "6", ""),
    ("ventilation", "testing", "Проверка тяги в вентиляционных каналах", "annual", [10], "4", ""),
    ("gas", "maintenance", "ТО внутридомового газового оборудования (специализированная организация)", "annual", [9], None, ""),
    ("fire_safety", "testing", "Проверка систем противопожарной защиты", "semiannual", [3, 9], "3", ""),
    ("elevators", "maintenance", "Техническое обслуживание лифтов (специализированная организация)", "monthly", list(range(1, 13)), None, ""),
    ("basement", "inspection", "Осмотр подвала: подтопление, коммуникации, грызуны", "quarterly", [1, 4, 7, 10], "2", ""),
    ("attic", "inspection", "Осмотр чердака: утеплитель, стропильная система", "semiannual", [4, 10], "2", ""),
    ("territory", "inspection", "Осмотр отмостки и водоотвода от фундамента", "annual", [5], "2", ""),
]


def forwards(apps, schema_editor):
    Rule = apps.get_model("workorders", "MaintenanceRule")
    for element, work_type, title, periodicity, months, hours, materials in RULES:
        Rule.objects.get_or_create(
            element_type_id=element,
            title=title,
            defaults={
                "work_type": work_type,
                "periodicity": periodicity,
                "months": months,
                "labor_hours": hours,
                "materials": materials,
                "note": "Типовой регламент — требует утверждения",
            },
        )


class Migration(migrations.Migration):
    dependencies = [("workorders", "0002_maintenance_plan"), ("buildings", "0005_passport_structure")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
