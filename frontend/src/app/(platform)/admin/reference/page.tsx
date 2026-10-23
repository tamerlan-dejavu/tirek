"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import type { Paginated } from "@/lib/api/client";
import { api } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { DefectCategory } from "@/lib/api/types";
import { ELEMENT_GROUP, formatDate, MONTHS_SHORT } from "@/lib/status";

interface ElementType {
  code: string;
  group: string;
  name: string;
  sort_order: number;
}
interface Template {
  id: string;
  name: string;
  inspection_type: string;
  is_active: boolean;
  latest_published_version: string | null;
  created_at: string;
}

interface Rule {
  id: number;
  element_type_name: string;
  work_type_display: string;
  title: string;
  periodicity_display: string;
  months: number[];
  labor_hours: string | null;
  note: string;
  is_active: boolean;
}

/** Typical ППР regulation used by the preliminary plan (spec §10). */
function MaintenanceRules() {
  const qc = useQueryClient();
  const query = useApi<Rule[]>("maintenance-rules/?all=1");
  const [error, setError] = useState<unknown>(null);

  async function toggle(rule: Pick<Rule, "is_active"> & { id: number | string }) {
    await api(`maintenance-rules/${rule.id}/`, {
      method: "PATCH",
      body: { is_active: !rule.is_active },
    }).catch(setError);
    qc.invalidateQueries({ queryKey: ["maintenance-rules/?all=1"] });
  }

  return (
    <Card index="D" title="Регламент ППР (типовой)" flush className="xl:col-span-2">
      {error ? (
        <div className="p-4">
          <ErrorState error={error} />
        </div>
      ) : null}
      <QueryState query={query} empty={(d) => d.length === 0} emptyTitle="Регламент не заполнен">
        {(rows) => (
          <Table
            caption="Регламент планово-предупредительных работ"
            rows={rows.map((r) => ({ ...r, id: String(r.id) }))}
            columns={[
              {
                key: "el",
                header: "Элемент / система",
                render: (r) => <span className="text-[13px]">{r.element_type_name}</span>,
              },
              {
                key: "t",
                header: "Работа",
                render: (r) => (
                  <div className="min-w-[220px]">
                    <div className={r.is_active ? "text-ink" : "text-faint line-through"}>
                      {r.title}
                    </div>
                    <div className="text-xs text-muted">{r.work_type_display}</div>
                  </div>
                ),
              },
              {
                key: "p",
                header: "Периодичность",
                render: (r) => <span className="text-[13px]">{r.periodicity_display}</span>,
              },
              {
                key: "m",
                header: "Месяцы",
                hideOnMobile: true,
                render: (r) => (
                  <span className="font-mono text-[12px] text-muted">
                    {r.months.length === 12
                      ? "каждый"
                      : r.months.map((m) => MONTHS_SHORT[m - 1]).join(", ")}
                  </span>
                ),
              },
              {
                key: "h",
                header: "Чел·ч",
                hideOnMobile: true,
                render: (r) => (
                  <span className="font-mono text-[13px] text-muted">{r.labor_hours ?? "—"}</span>
                ),
              },
              {
                key: "a",
                header: "",
                render: (r) => (
                  <Button size="sm" variant="ghost" onClick={() => toggle(r)}>
                    {r.is_active ? "Отключить" : "Включить"}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </QueryState>
      <p className="border-t border-line px-4 py-3 text-[11px] text-faint">
        Типовой регламент — рабочее предложение, требует утверждения ответственной организацией.
        Работы предлагаются только для элементов, отмеченных в паспорте дома как «есть».
      </p>
    </Card>
  );
}

function DefectCategories() {
  const qc = useQueryClient();
  const query = useApi<DefectCategory[]>("defect-categories/?all=1");
  const [error, setError] = useState<unknown>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["defect-categories/?all=1"] });

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(null);
    try {
      await api("defect-categories/", {
        method: "POST",
        body: {
          code: f.get("code"),
          name: f.get("name"),
          description: f.get("description"),
          sort_order: 85,
        },
      });
      form.reset();
      refresh();
    } catch (err) {
      setError(err);
    }
  }

  async function toggle(c: DefectCategory) {
    await api(`defect-categories/${c.code}/`, {
      method: "PATCH",
      body: { is_active: !c.is_active },
    }).catch(setError);
    refresh();
  }

  const input =
    "h-9 rounded-md border border-line bg-surface px-2.5 text-sm focus:border-accent focus:outline-none";
  return (
    <Card index="A" title="Категории дефектов" flush className="xl:col-span-2">
      <QueryState query={query}>
        {(rows) => (
          <Table
            caption="Категории дефектов"
            rows={rows.map((r) => ({ ...r, id: r.code }))}
            columns={[
              {
                key: "name",
                header: "Категория",
                render: (c) => (
                  <span className={c.is_active ? "text-ink" : "text-faint line-through"}>
                    {c.name}
                  </span>
                ),
              },
              {
                key: "d",
                header: "Что относится",
                hideOnMobile: true,
                render: (c) => <span className="text-[13px] text-muted">{c.description}</span>,
              },
              {
                key: "n",
                header: "Открытых дефектов",
                align: "right",
                render: (c) => <span className="font-mono text-[13px]">{c.open_defects}</span>,
              },
              {
                key: "a",
                header: <span className="sr-only">Действие</span>,
                align: "right",
                render: (c) => (
                  <button
                    onClick={() => toggle(c)}
                    className="text-[13px] text-muted hover:text-ink"
                  >
                    {c.is_active ? "Отключить" : "Включить"}
                  </button>
                ),
              },
            ]}
          />
        )}
      </QueryState>
      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-2 border-t border-line px-5 py-4 md:px-6"
      >
        <input
          name="name"
          required
          placeholder="Новая категория"
          aria-label="Название"
          className={`${input} min-w-[200px] flex-1`}
        />
        <input
          name="code"
          required
          pattern="[a-z0-9_-]+"
          placeholder="код (латиница)"
          aria-label="Код"
          className={`${input} w-40 font-mono`}
        />
        <input
          name="description"
          placeholder="Что относится"
          aria-label="Описание"
          className={`${input} min-w-[200px] flex-1`}
        />
        <Button type="submit" size="sm">
          Добавить
        </Button>
      </form>
      <p className="px-5 pb-4 text-xs text-faint md:px-6">
        Категории расширяются по накопленной статистике: если в «Прочее» копятся однотипные дефекты
        — выделите их в отдельную категорию. Категории не удаляются, а отключаются: история записей
        сохраняется.
      </p>
      {error ? (
        <div className="px-5 pb-4 md:px-6">
          <ErrorState error={error} />
        </div>
      ) : null}
    </Card>
  );
}

/** Administrator reference data: element classifier (ТЗ 5.4) and checklist templates (ТЗ 5.5). */
export default function ReferencePage() {
  const types = useApi<ElementType[]>("element-types/");
  const templates = useApi<Paginated<Template>>("checklist-templates/");

  return (
    <>
      <PageHeader
        code="Управление · справочники"
        title="Справочники"
        subtitle="Категории дефектов, классификатор элементов здания, шаблоны чек-листов и регламент ППР. Опубликованная версия чек-листа не меняется — правки выпускаются новой версией."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <DefectCategories />
        <Card index="B" title="Классификатор элементов здания" flush>
          <QueryState query={types} empty={(d) => d.length === 0}>
            {(rows) => (
              <Table
                caption="Типы элементов"
                rows={rows.map((r) => ({ ...r, id: r.code }))}
                columns={[
                  {
                    key: "code",
                    header: "Код",
                    render: (r) => (
                      <span className="font-mono text-[13px] text-muted">{r.code}</span>
                    ),
                  },
                  { key: "name", header: "Элемент", render: (r) => r.name },
                  {
                    key: "group",
                    header: "Группа",
                    render: (r) => (
                      <span className="text-[13px] text-muted">
                        {ELEMENT_GROUP[r.group] ?? r.group}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </QueryState>
        </Card>
        <Card index="C" title="Шаблоны чек-листов" flush>
          <QueryState
            query={templates}
            empty={(d) => d.results.length === 0}
            emptyTitle="Шаблонов нет"
          >
            {(d) => (
              <Table
                caption="Шаблоны чек-листов"
                rows={d.results}
                columns={[
                  { key: "n", header: "Шаблон", render: (t) => t.name },
                  {
                    key: "v",
                    header: "Опубликованная версия",
                    render: (t) =>
                      t.latest_published_version ? (
                        <StatusBadge label="Опубликована" tone="healthy" />
                      ) : (
                        <StatusBadge label="Только черновик" tone="warning" />
                      ),
                  },
                  {
                    key: "c",
                    header: "Создан",
                    hideOnMobile: true,
                    render: (t) => (
                      <span className="font-mono text-[13px] text-muted">
                        {formatDate(t.created_at)}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </QueryState>
        </Card>
        <MaintenanceRules />
      </div>
    </>
  );
}
