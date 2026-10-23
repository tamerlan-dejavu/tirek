# Архитектура Tirek MVP 1.0

## 1. Компоненты

```
 Браузер (поставщик · ОСИ · полевой специалист на смартфоне)
        │  HTTPS, один origin
        ▼
     nginx ──► Next.js (UI, без доверенных прав)
        │
        └──► /api ──► Django + DRF ──► PostgreSQL   (данные, история, аудит)
                         │       └──► S3 private   (фото, документы, PDF)
                         └──► Celery worker ◄── Redis (PDF, e-mail)
```

- Модульный монолит, без микросервисов и Kubernetes (ТЗ 8.2).
- Celery используется только для длительных задач (генерация PDF, письма); всё остальное — синхронно.
- Браузер общается с одним origin, поэтому сессионная cookie остаётся first-party, а CORS в production не нужен.

## 2. Соответствие модулей ТЗ и кода

| Модуль ТЗ | Backend app | Ключевые файлы |
| --- | --- | --- |
| M01 Авторизация | `accounts` | `models.py` (User, UserSession, OneTimeToken), `views.py`, `middleware.py` |
| M02 Организации и доступ | `organizations`, `core/access.py` | `BuildingOrganizationLink`, `BuildingAssignment` |
| M03 Паспорт | `buildings` | `Building` + `simple_history`, `field_sources` |
| M04 Элементы | `buildings` | `ElementType` (классификатор, миграция 0003), `BuildingElement` (иерархия) |
| M05 Обследования | `checklists`, `inspections` | `ChecklistTemplateVersion` (заморозка), `inspections/services.py` |
| M06 Дефекты | `defects` | `TRANSITIONS`, `DefectObservation`, `DefectEvent` |
| M07 Риск | `risks` | `RiskAssessment` (immutable, ревизии), `services.assess`, `methodology.py` (расчёт-подсказка) |
| M08 Мероприятия и ППР | `workorders` | `TARGET_ROLES`, `services.transition`, `planning.generate` / `planning.annual`, `MaintenanceRule` |
| Диспетчерский модуль | `service_requests` | `TRANSITIONS` (7 статусов), `services.complete` (фото результата), `views.ServiceRequestViewSet` |
| M09 Файлы | `files` | `services.store_upload`, `views.download` |
| M10 Кабинет ОСИ | `portal` | агрегаты только по опубликованному |
| M11 PDF | `reports` | `snapshot.py`, `tasks.py`, `templates/reports/inspection_report.html` |
| M12 Журнал и аналитика | `audit`, `analytics` | `audit.services.log`, `analytics.views.dashboard` |

## 3. Модель доступа (ТЗ 4.3, 9.2)

Решение никогда не принимается только по роли. Цепочка проверки в `apps/core/access.py`:

```
user ─► активное членство в организации (role)
     ─► активная связь организации с домом (valid_from ≤ now < valid_to)
     ─► тип организации допускает эту роль (provider ↔ provider-роли, customer ↔ ОСИ)
     ─► для полевого специалиста — назначение на дом (BuildingAssignment)
     ─► статус записи и действие (в services.* каждого модуля)
```

- Все списки строятся через `access.scope_to_buildings()` — чужие записи возвращают 404, а не 403, чтобы не раскрывать их существование.
- Мутации вызывают `access.require(user, building_id, *roles)`.
- `BuildingScopedViewSet` не даёт DELETE: история сохраняется, связи закрываются (`valid_to`), а не удаляются.
- Видимость для ОСИ: только опубликованные обследования, подтверждённые дефекты из них, опубликованные отчёты и документы.
- Негативные тесты: `backend/tests/test_isolation.py`.

## 4. Жизненные циклы

**Обследование** (`inspections/models.py: TRANSITIONS`)

```
draft ──submit──► submitted ──approve──► approved ──publish──► (виден ОСИ)
  │                  │                      └──correction──► новая версия (draft), старая неизменна
  │                  └──return(comment)──► returned ──submit──► submitted
  └──cancel(reason)──► cancelled
```
`submit` проверяет обязательные пункты и фото при «не соответствует»; `approve` требует, чтобы все дефекты были подтверждены или отклонены.

**Дефект** (`defects/models.py`)

```
detected ─► in_review ─► confirmed ─► planned ─► fixing ─► fix_review ─► closed
               │  ▲            └──────────────(основание)───────────────►┘
               ▼  │
       needs_clarification          in_review ─► rejected (обоснование)
```
Дефект из обследования уходит на проверку вместе с обследованием; дефект, зарегистрированный отдельно (реестр, заявка), — сразу при создании.
Переход в `confirmed` возможен только вместе с `RiskAssessment` (R1–R4 + обоснование) от проверяющего инженера. R1 → немедленное `UrgentNotice` всем организациям дома.

**Оценка риска** (`risks/methodology.py`): вероятность × последствия × состояние × срок эксплуатации (каждый 1–5) → балл → предложенная категория по порогам. Категорию утверждает инженер; отличие от расчёта пишется в журнал. Шкалы и пороги — предварительная методика, требуют утверждения.

**Заявка** (`service_requests/models.py`)

```
new ─► accepted ─► assigned ─► in_progress ─► done ─► verified ─► closed
 └────────┴─► rejected                 ▲          │
                                       └─(возврат)┘
```
Диспетчер принимает, задаёт приоритет, назначает и закрывает; исполнитель начинает и отмечает выполнение (обязательны описание и фото результата `repair_photo`); проверяет инженер или диспетчер, но не сам исполнитель. Источник заявки (житель, специалист, диспетчер, инженер, ОСИ) определяется по роли подавшего.

**Предварительный план** (`workorders/planning.py`): мероприятия по подтверждённым дефектам без открытого мероприятия (срок — по категории риска) и по типовому регламенту ППР для элементов, отмеченных в паспорте как «есть». Всё создаётся «Предложено»; повторный запуск не дублирует.

**Мероприятие** (`workorders/models.py`): кто может перевести в статус — `TARGET_ROLES`.

| В статус | Кто |
| --- | --- |
| agreed / rejected | ОСИ (управленческое решение) |
| postponed | ОСИ или инженер (с причиной) |
| scheduled / in_progress / done | ОСИ, инженер или назначенный исполнитель; `done` требует подтверждающий файл |
| verified | проверяющий инженер → дефект закрывается с основанием |
| closed / cancelled | инженер / администратор |

## 5. Неизменяемость и история (ТЗ 2.3, 7.2, 9.7)

| Что | Как |
| --- | --- |
| Паспорт, элементы | `django-simple-history` + `field_sources` (источник и дата значения) |
| Шаблон чек-листа | опубликованная версия не редактируется; обследование ссылается на версию |
| Утверждённое обследование | исправление = новая запись `supersedes` + `correction_reason` |
| Оценка риска | `save()` запрещён для существующих записей; пересмотр = новая версия |
| Статусы дефектов / мероприятий | `DefectEvent`, `WorkOrderEvent` |
| PDF | `Report.snapshot` фиксирует данные; файл + SHA-256; версии не перезаписываются |
| Журнал аудита | `AuditEvent` append-only, удаление запрещено (`ProtectedHistoryModel`) |

## 6. Надёжность

- `ATOMIC_REQUESTS = True`: каждый запрос — одна транзакция.
- `IdempotencyMiddleware`: повтор мутации с тем же `Idempotency-Key` возвращает сохранённый ответ (frontend добавляет ключ автоматически).
- Автосохранение ответов чек-листа на сервер (`InspectionAnswerViewSet.create` = upsert).

## 7. Файлы (ТЗ 5.9)

Загрузка → проверка размера → определение реального типа (libmagic) → белый список типов → перекодирование изображений (удаление EXIF/GPS и «хвостов») → SHA-256 → приватный bucket со случайным ключом. Скачивание: проверка доступа → редирект на подписанную ссылку с TTL `S3_SIGNED_URL_TTL`.

## 8. Открытые вопросы, влияющие на код (ТЗ 15.2)

| Вопрос | Где отразится |
| --- | --- |
| Кто утверждает чек-листы | `ChecklistTemplateVersion.approved_by_note`, права на `publish` |
| Признаки R1–R4 и процедура эскалации | `risks.services.URGENT_CATEGORIES`, текст уведомления |
| Место хранения production-данных | `S3_*`, `DATABASE_URL`, `docker-compose.prod.yml` |
| Сроки хранения документов и журналов | политика очистки (не реализована — удаление сейчас запрещено) |
| Казахский интерфейс на пилоте | `LANGUAGES`, словари frontend |
| Работа без интернета | вне MVP; автосохранение уже серверное |
