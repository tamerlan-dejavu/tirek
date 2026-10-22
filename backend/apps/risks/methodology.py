"""
Risk scoring aid: probability × consequences × technical condition × service life → R1–R4.

PRELIMINARY METHODOLOGY. Scales and thresholds below are a working proposal and must be
approved by the responsible engineering organization before real use (ТЗ 5.7, 15.2 q.4).
The result is a SUGGESTION: the reviewing engineer confirms or overrides it with a
justification; an override is recorded. The platform never issues automatic safety verdicts.
"""

from datetime import date

STATUS = "Предварительная методика — требует утверждения ответственной организацией"

# Each factor is scored 1–5
SCALES: dict[str, dict] = {
    "probability": {
        "label": "Вероятность возникновения проблемы",
        "levels": {
            1: "Маловероятно",
            2: "Возможно в отдалённой перспективе",
            3: "Вероятно в ближайшие годы",
            4: "Высоковероятно в ближайший сезон",
            5: "Уже происходит или неизбежно",
        },
    },
    "consequences": {
        "label": "Последствия",
        "levels": {
            1: "Незначительные, косметические",
            2: "Ограниченный ущерб имуществу",
            3: "Нарушение работы систем, ущерб нескольким квартирам",
            4: "Отключение систем дома, значительный ущерб",
            5: "Угроза жизни и здоровью, обрушение, пожар",
        },
    },
    "condition": {
        "label": "Техническое состояние элемента",
        "levels": {
            1: "Исправное",
            2: "Работоспособное, единичные дефекты",
            3: "Ограниченно работоспособное",
            4: "Неудовлетворительное",
            5: "Аварийное",
        },
    },
    "service_life": {
        "label": "Срок эксплуатации",
        "levels": {
            1: "До 10 лет",
            2: "10–25 лет",
            3: "25–40 лет",
            4: "40–50 лет",
            5: "Более 50 лет или нормативный срок превышен",
        },
    },
}
FACTORS = tuple(SCALES)

# score = product of the four factors (1…625); first threshold reached wins
THRESHOLDS: list[tuple[int, str]] = [(256, "R1"), (81, "R2"), (16, "R3"), (1, "R4")]

RESPONSE: dict[str, dict] = {
    "R1": {"label": "Критический риск", "action": "Требуется немедленная реакция", "days": 1},
    "R2": {"label": "Высокий риск", "action": "Первоочередное включение в план работ", "days": 14},
    "R3": {"label": "Средний риск", "action": "Плановое устранение", "days": 90},
    "R4": {"label": "Низкий риск", "action": "Наблюдение и профилактический контроль", "days": 365},
}

# Service-life level from building age when the element's own age is unknown
AGE_BANDS: list[tuple[int, int]] = [(10, 1), (25, 2), (40, 3), (50, 4)]


def score(probability: int, consequences: int, condition: int, service_life: int) -> int:
    return probability * consequences * condition * service_life


def suggest(value: int) -> str:
    return next(cat for threshold, cat in THRESHOLDS if value >= threshold)


def service_life_level(year_built: int | None, today: date | None = None) -> int | None:
    if not year_built:
        return None
    age = (today or date.today()).year - year_built
    return next((level for limit, level in AGE_BANDS if age < limit), 5)


def as_dict() -> dict:
    return {
        "status": STATUS,
        "formula": "вероятность × последствия × техническое состояние × срок эксплуатации",
        "scales": {k: {"label": v["label"], "levels": v["levels"]} for k, v in SCALES.items()},
        "thresholds": [{"min_score": t, "category": c} for t, c in THRESHOLDS],
        "response": RESPONSE,
        "age_bands": [{"under_years": a, "level": lvl} for a, lvl in AGE_BANDS]
        + [{"under_years": None, "level": 5}],
    }
