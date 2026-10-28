"""
Demo role picker registry — the single source of truth for demo accounts.

Password-less login is possible ONLY into these accounts and ONLY when settings.DEMO_MODE
is true. The accounts themselves are created by `manage.py seed_demo`.
"""

from dataclasses import asdict, dataclass

# Shown only while resident polls are enabled (settings.FEATURE_POLLS)
POLLS_ABILITY = "Опросы жителей"


@dataclass(frozen=True)
class DemoAccount:
    key: str
    email: str
    title: str
    person: str
    summary: str
    abilities: tuple[str, ...]
    home: str
    group: str  # "residents" | "provider" | "customer"


DEMO_ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount(
        key="resident",
        email="resident@customer.local",
        title="Житель",
        person="Асель Бекова, кв. 34",
        summary="Сообщает о проблемах в доме и следит за их решением",
        abilities=(
            "Подача заявки",
            "Фото и видео проблемы",
            "Статус заявки",
            "Уведомления",
            POLLS_ABILITY,
            "Планируемые работы",
        ),
        home="/resident",
        group="residents",
    ),
    DemoAccount(
        key="field",
        email="field@provider.local",
        title="Полевой специалист",
        person="Данияр Ахметов",
        summary="Проводит обследования на объекте",
        abilities=(
            "Обследование",
            "Чек-листы",
            "Фото- и видеофиксация",
            "Технические параметры",
            "Регистрация дефектов",
            "Привязка к элементу здания",
        ),
        home="/inspections",
        group="provider",
    ),
    DemoAccount(
        key="engineer",
        email="engineer@provider.local",
        title="Инженер ЕИТЦ",
        person="Ерлан Касымов",
        summary="Проверяет результаты и отвечает за инженерные выводы",
        abilities=(
            "Проверка обследований",
            "Анализ дефектов",
            "Категория риска R1–R4",
            "Технические рекомендации",
            "Планы обслуживания",
        ),
        home="/dashboard",
        group="provider",
    ),
    DemoAccount(
        key="pto",
        email="pto@provider.local",
        title="ПТО / производственный блок",
        person="Марат Жумабаев",
        summary="Планирует производство работ и ресурсы",
        abilities=(
            "Планы производства работ",
            "Календарное планирование",
            "Контроль ресурсов",
            "Задания исполнителям",
        ),
        home="/work-orders",
        group="provider",
    ),
    DemoAccount(
        key="dispatcher",
        email="dispatcher@provider.local",
        title="Диспетчер",
        person="Гульнара Омарова",
        summary="Принимает заявки и распределяет задачи",
        abilities=(
            "Обработка заявок",
            "Распределение задач",
            "Контроль сроков",
            "Аварийное реагирование",
        ),
        home="/requests",
        group="provider",
    ),
    DemoAccount(
        key="osi",
        email="osi@customer.local",
        title="Управляющая организация / ОСИ",
        person="Сауле Нурланова, председатель ОСИ",
        summary="Принимает управленческие решения по дому",
        abilities=(
            "Аналитика по дому",
            "Техническое состояние",
            "Согласование работ",
            "Контроль исполнения",
        ),
        home="/osi",
        group="customer",
    ),
    DemoAccount(
        key="admin",
        email="admin@provider.local",
        title="Администратор ЕИТЦ",
        person="Айгерим Сапарова",
        summary="Управляет пользователями, объектами и справочниками",
        abilities=(
            "Пользователи",
            "Объекты",
            "Справочники",
            "Права доступа",
            "Отчётность",
        ),
        home="/dashboard",
        group="provider",
    ),
)

BY_KEY = {a.key: a for a in DEMO_ACCOUNTS}


def public_list() -> list[dict]:
    return [asdict(a) for a in DEMO_ACCOUNTS]
