# Критерии приёмки → проверки

| Код | Критерий (кратко) | Где проверяется |
| --- | --- | --- |
| AC-01 | Две независимые организации и пользователи с разными правами | `tests/conftest.py::world`, `seed_demo` |
| AC-02 | Данные организации недоступны постороннему через UI и API | `tests/test_isolation.py`, `e2e/smoke.spec.ts` |
| AC-03 | Дом с обязательными паспортными характеристиками | `buildings` API; e2e — TODO |
| AC-04 | Иерархия элементов | `BuildingElementSerializer.validate` (цикл, чужой дом) |
| AC-05 | Обследование по опубликованной версии чек-листа | `InspectionSerializer.validate_template_version` |
| AC-06 | Специалист заполняет и сохраняет черновик | `test_workflow.py::_fill_and_submit`, автосохранение UI |
| AC-07 | Безопасное прикрепление фото | `files/services.py`; тест загрузки — TODO |
| AC-08 | Дефект привязан к объекту и элементу | `test_workflow.py` |
| AC-09 | Возврат на доработку с комментарием | `test_engineer_returns_inspection_with_comment` |
| AC-10 | Подтверждение риска с обоснованием | `test_full_cycle` |
| AC-11 | Неутверждённое не публикуется | `test_unapproved_inspection_cannot_be_published_or_reported` |
| AC-12 | Мероприятие из подтверждённого дефекта | `test_full_cycle`, `WorkOrderSerializer.validate` |
| AC-13 | Смена статуса мероприятия в истории | `test_full_cycle` (events) |
| AC-14 | ОСИ видит только разрешённое и опубликованное | `test_customer_does_not_see_unpublished_inspection`, `test_full_cycle` |
| AC-15 | PDF с реальными сведениями, дефектами, фото | `reports/snapshot.py`, шаблон; генерация проверяется в Docker (WeasyPrint) — TODO тест |
| AC-16 | Версия отчёта неизменна при повторном скачивании | `Report.snapshot` + SHA-256; TODO тест |
| AC-17 | Повторное наблюдение сохраняет историю | `test_repeated_observation_keeps_history` |
| AC-18 | История изменений доступна администратору | `test_audit_log_hidden_from_foreign_admin` |
| AC-19 | Автотесты доступа и процессов | CI `.github/workflows/ci.yml` |
| AC-20 | Пилот на реальном здании | организационный этап 6 |
