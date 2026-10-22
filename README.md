# Tirek — MVP 1.0

Цифровая платформа инженерного сопровождения многоквартирных жилых домов:
паспорт → обследование → дефекты → проверка и риск → план мероприятий → публикация для ОСИ → PDF-отчёт → контроль устранения.

Модульный монолит (ТЗ 8): Django + DRF backend и Next.js frontend в одном репозитории; вся бизнес-логика и проверка прав — на сервере.

## Быстрый старт

Нужен только запущенный Docker Desktop. Миграции применяются автоматически при старте backend.

**Windows (PowerShell)** — `make` на Windows обычно не установлен:

```powershell
.\tirek.ps1 up     # создаёт .env из .env.example, собирает и запускает стек
.\tirek.ps1 seed   # демо-организации, пользователи, дом, чек-лист (пароль: tirek-demo-2026)
.\tirek.ps1 logs   # логи backend / worker / frontend
```

Если PowerShell запрещает скрипты: `powershell -ExecutionPolicy Bypass -File .\tirek.ps1 up`.

**Linux / macOS:** `make up`, затем `make seed`.

**Без скриптов:** `copy .env.example .env`, `docker compose up -d --build`, `docker compose exec backend python manage.py seed_demo`.

| Сервис | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API / Swagger | http://localhost:8010/api/docs/ |
| Django admin | http://localhost:8010/admin/ |
| Mailpit (письма приглашений и сброса пароля) | http://localhost:8025 |

Порты задаются в `.env` (`TIREK_*_PORT`). Postgres и Redis наружу не публикуются, поэтому не конфликтуют с локальными установками. Файлы в dev хранятся в приватном docker-томе, в production — в S3 (`STORAGE_BACKEND=s3`).

### Вход на демо-стенде

При `DEMO_MODE=true` (включено в `.env.example`) страница `/login` показывает экран **«Кто вы?»**: выберите роль — и вы внутри.
Сменить роль — кнопка «Сменить роль» в верхней панели. Беспарольный вход работает только для фиксированных демо-аккаунтов
([backend/apps/accounts/demo.py](backend/apps/accounts/demo.py)); **на стенде с реальными данными `DEMO_MODE` должен быть выключен.**

| Роль | Email | Стартовая страница |
| --- | --- | --- |
| Житель | `resident@customer.local` | `/resident` — заявки, фото/видео, статус, опросы, работы в доме |
| Полевой специалист | `field@provider.local` | `/inspections` — обследования, чек-листы, дефекты |
| Инженер ЕИТЦ | `engineer@provider.local` | `/dashboard` — проверка, риск R1–R4, рекомендации |
| ПТО / производственный блок | `pto@provider.local` | `/work-orders` — план производства, ресурсы, задания |
| Диспетчер | `dispatcher@provider.local` | `/requests` — заявки, назначение, сроки, аварии |
| ОСИ | `osi@customer.local` | `/osi` — состояние дома, согласование работ |
| Администратор ЕИТЦ | `admin@provider.local` | `/dashboard` — пользователи, справочники |

Для входа по email пароль у всех демо-аккаунтов `tirek-demo-2026`; `admin@other.local` — чужая организация (проверка изоляции).

### Если не открывается

| Симптом | Причина и решение |
| --- | --- |
| `make: command not found` | На Windows используйте `.\tirek.ps1` |
| Пустая страница / «Problem loading page» | Стек ещё не запущен или собирается: `docker compose ps`, `.\tirek.ps1 logs`. Первая загрузка страницы в dev компилируется ~30 с |
| `port is already allocated` | Порт занят другим проектом — поменяйте `TIREK_*_PORT` в `.env` (и `CORS/CSRF/FRONTEND_URL`, если меняете порт frontend) |
| Ошибки CSRF при входе | Адрес, с которого открыт сайт, должен быть в `CSRF_TRUSTED_ORIGINS` в `.env` |

## Структура репозитория

```
tirek/
├── backend/                     Django 5.2 + DRF, Python 3.13
│   ├── config/                  settings (base/dev/test/prod), urls, celery
│   ├── apps/
│   │   ├── core/                UUID-модели, единая точка авторизации (access.py), идемпотентность
│   │   ├── accounts/       M01  пользователи, сессии, приглашения, сброс пароля, блокировка подбора
│   │   ├── organizations/  M02  организации, роли, связи «организация — дом», назначения
│   │   ├── buildings/      M03–M04  паспорт с историей, классификатор и иерархия элементов, документы
│   │   ├── checklists/     M05  шаблоны чек-листов с неизменяемыми опубликованными версиями
│   │   ├── inspections/    M05  обследования, ответы, проверки, исправления новой версией
│   │   ├── defects/        M06  реестр дефектов, повторные наблюдения, история статусов
│   │   ├── risks/          M07  экспертная оценка R1–R4 с обоснованием и ревизиями
│   │   ├── workorders/     M08  мероприятия, разделение ответственности, история
│   │   ├── files/          M09  приватное хранилище (S3 в prod, том в dev), проверка типа, подписанные ссылки
│   │   ├── portal/         M10  кабинет ОСИ (только опубликованное)
│   │   ├── reports/        M11  версионированные неизменяемые PDF (WeasyPrint)
│   │   ├── audit/          M12  журнал аудита (append-only)
│   │   ├── analytics/      M12  базовые показатели
│   │   └── notifications/       уведомления, срочные оповещения об опасных дефектах
│   ├── templates/reports/       HTML-шаблон PDF-отчёта
│   └── tests/                   pytest: изоляция организаций, сквозной цикл, авторизация
├── frontend/                    Next.js 15 (App Router), React 19, TypeScript, Tailwind 4
│   ├── src/app/
│   │   ├── (public)/            лендинг (тёмная тема)
│   │   ├── (auth)/              вход, приглашение, восстановление пароля
│   │   ├── (platform)/          рабочее место поставщика: главная, дома, карточка здания (8 вкладок),
│   │   │                        обследования, чек-лист на мобильном, дефекты, план работ, отчёты, админка
│   │   └── (osi)/osi/           кабинет ОСИ
│   ├── src/components/          UI-kit (Badge/RiskBadge/ApprovalTag, Button, Card, Table, States), списки
│   ├── src/lib/                 API-клиент (CSRF, Idempotency-Key), типы, статусы, права для UI
│   └── e2e/                     Playwright (desktop + mobile)
├── infra/nginx/                 единый origin для production
├── docs/                        архитектура, ADR, карта критериев приёмки
├── docker-compose.yml           dev-окружение
├── docker-compose.prod.yml      production-оверлей
└── .github/workflows/ci.yml     lint, миграции, тесты, сборка
```

## Команды

| Команда | Что делает |
| --- | --- |
| `make test-back` | pytest в контейнере |
| `make test-front` / `make e2e` | Vitest / Playwright |
| `make lint` / `make fmt` | ruff + eslint/tsc / автоформат |
| `make makemigrations` | новые миграции |
| `make schema` | OpenAPI → типы для frontend (`src/lib/api/schema.d.ts`) |

Локально без Docker (backend): `cd backend && python -m venv .venv && .venv/Scripts/pip install -e ".[dev]" && pytest` — тесты используют SQLite и in-memory хранилище.

## Документация

- [docs/architecture.md](docs/architecture.md) — модули, модель доступа, жизненные циклы, соответствие ТЗ
- [docs/acceptance.md](docs/acceptance.md) — критерии приёмки AC-01…AC-20 и где они проверяются
- [docs/adr/](docs/adr/) — архитектурные решения

> Tirek не заменяет инженерную экспертизу, работу ОСИ и фактическое обслуживание здания.
> PDF Tirek не является официальным экспертным заключением.
