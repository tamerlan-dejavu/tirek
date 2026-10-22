"""
Initial defect categories, back-fill of existing defects, default priority from danger degree.
Only unambiguous keyword matches are mapped; everything else stays empty for a person to set.
"""

from django.db import migrations

CATEGORIES = [
    # code, name, description
    ("cracks", "Трещины и раскрытие швов", "Трещины в конструкциях, раскрытие межпанельных и деформационных швов"),
    ("leaks", "Протечки и замачивание", "Протечки кровли и систем, подтопление, следы замачивания"),
    ("corrosion", "Коррозия", "Коррозия арматуры, трубопроводов, металлоконструкций"),
    ("destruction", "Разрушение материала", "Отслоение защитного слоя, выкрашивание, разрушение отделки и бетона"),
    ("deformation", "Деформации и осадки", "Прогибы, крены, просадки, смещения элементов"),
    ("insulation", "Нарушение изоляции и герметизации", "Тепло-, гидро-, пароизоляция, герметики, утеплитель"),
    ("equipment", "Неисправность оборудования", "Отказы и неисправности инженерного оборудования и арматуры"),
    ("safety", "Нарушение требований безопасности", "Пожарная, электрическая безопасность, ограждения"),
    ("other", "Прочее", "Не подходит ни под одну категорию — повод расширить справочник"),
]

KEYWORDS = [
    ("корроз", "corrosion"),
    ("протеч", "leaks"),
    ("подтоплен", "leaks"),
    ("замачив", "leaks"),
    ("течь", "leaks"),
    ("трещ", "cracks"),
    ("шва", "cracks"),
    ("отслоен", "destruction"),
    ("разрушен", "destruction"),
    ("просадк", "deformation"),
]

PRIORITY_BY_RISK = {"R1": "urgent", "R2": "high", "R3": "normal", "R4": "low"}


def forwards(apps, schema_editor):
    Category = apps.get_model("defects", "DefectCategory")
    Defect = apps.get_model("defects", "Defect")
    for i, (code, name, description) in enumerate(CATEGORIES):
        Category.objects.update_or_create(
            code=code, defaults={"name": name, "description": description, "sort_order": i * 10}
        )
    for d in Defect.objects.select_related("current_risk"):
        changed = []
        if d.category_id is None:
            text = d.defect_type.lower()
            for kw, code in KEYWORDS:
                if kw in text:
                    d.category_id = code
                    changed.append("category")
                    break
        if not d.priority and d.current_risk_id:
            d.priority = PRIORITY_BY_RISK[d.current_risk.category]
            changed.append("priority")
        if changed:
            d.save(update_fields=changed)


class Migration(migrations.Migration):
    dependencies = [("defects", "0003_categories_priority"), ("risks", "0001_initial")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
