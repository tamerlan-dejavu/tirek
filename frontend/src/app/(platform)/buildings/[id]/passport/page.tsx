"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { use, useState, type FormEvent } from "react";

import { PassportEntryDialog } from "@/components/buildings/PassportEntryDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { Table } from "@/components/ui/Table";
import { api } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import type { Building, PassportEntry } from "@/lib/api/types";
import { can, roles } from "@/lib/permissions";
import { formatDate, orUnknown, PRESENCE, STRUCTURAL_SCHEME } from "@/lib/status";

/* «Общие сведения» in the order of the passport structure */
const GENERAL: { key: keyof Building; label: string; unit?: string; type: "text" | "number" | "scheme" }[] = [
  { key: "address", label: "Адрес", type: "text" },
  { key: "year_built", label: "Год строительства", type: "number" },
  { key: "floors", label: "Количество этажей", type: "number" },
  { key: "entrances", label: "Количество подъездов", type: "number" },
  { key: "total_area_m2", label: "Площадь", unit: "м²", type: "number" },
  { key: "apartments", label: "Количество квартир", type: "number" },
  { key: "structural_scheme", label: "Конструктивная схема", type: "scheme" },
];

const SECTIONS: { group: PassportEntry["group"]; index: string; title: string }[] = [
  { group: "structural", index: "2", title: "Конструктивные элементы" },
  { group: "engineering", index: "3", title: "Инженерные системы" },
  { group: "operational", index: "4", title: "Эксплуатационные элементы" },
];

function display(b: Building, f: (typeof GENERAL)[number]) {
  const v = b[f.key];
  if (f.type === "scheme") return STRUCTURAL_SCHEME[String(v)] ?? orUnknown(v);
  if (f.key === "total_area_m2" && v !== null && v !== "") {
    return `${Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${f.unit}`;
  }
  return orUnknown(v, f.unit);
}

function GeneralForm({ b, onDone }: { b: Building; onDone: () => void }) {
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { source: f.get("source") };
    for (const g of GENERAL) {
      const raw = String(f.get(g.key) ?? "").trim();
      body[g.key] = g.type === "number" ? (raw === "" ? null : raw) : raw || (g.type === "scheme" ? "unknown" : raw);
    }
    try {
      await api(`buildings/${b.id}/`, { method: "PATCH", body });
      onDone();
    } catch (err) {
      setError(err);
    }
  }
  const input = "mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GENERAL.map((g) => (
          <label key={g.key} className="block text-sm">
            <span className="text-muted">
              {g.label}
              {g.unit ? `, ${g.unit}` : ""}
            </span>
            {g.type === "scheme" ? (
              <select name={g.key} defaultValue={String(b[g.key] ?? "unknown")} className={input}>
                {Object.entries(STRUCTURAL_SCHEME).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k === "unknown" ? "Неизвестно" : v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={g.key}
                type={g.type}
                step={g.key === "total_area_m2" ? "0.01" : undefined}
                required={g.key === "address"}
                defaultValue={b[g.key] === null ? "" : String(b[g.key])}
                placeholder="неизвестно"
                className={`${input} ${g.type === "number" ? "font-mono" : ""}`}
              />
            )}
          </label>
        ))}
      </div>
      <label className="block text-sm">
        <span className="text-muted">Источник сведений</span>
        <input name="source" required placeholder="Техпаспорт БТИ, кадастровая выписка, осмотр…" className={input} />
      </label>
      <p className="text-xs text-faint">Пустое поле — «неизвестно». Не вписывайте предполагаемые значения.</p>
      {error ? <ErrorState error={error} /> : null}
      <div className="flex gap-2">
        <Button type="submit">Сохранить</Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

/** Digital passport of the building: general data + three classifier sections (ТЗ 5.3–5.4). */
export default function PassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const { data: me } = useMe();
  const building = useApi<Building>(`buildings/${id}/`);
  const entries = useApi<PassportEntry[]>(`passport-entries/?building=${id}`);
  const [editingGeneral, setEditingGeneral] = useState(false);
  const [editing, setEditing] = useState<PassportEntry | null>(null);
  const canEditGeneral = can.editBuilding(me);
  const canEditEntries = canEditGeneral || roles(me).has("field_specialist");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: [`buildings/${id}/`] });
    qc.invalidateQueries({ queryKey: [`passport-entries/?building=${id}`] });
    qc.invalidateQueries({ queryKey: [`buildings/${id}/history/`] });
  };

  return (
    <div className="space-y-6">
      <Card
        index="1"
        title="Общие сведения"
        actions={
          canEditGeneral && !editingGeneral ? (
            <Button variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setEditingGeneral(true)}>
              Изменить
            </Button>
          ) : null
        }
      >
        <QueryState query={building}>
          {(b) =>
            editingGeneral ? (
              <GeneralForm
                b={b}
                onDone={() => {
                  setEditingGeneral(false);
                  refresh();
                }}
              />
            ) : (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                {GENERAL.map((g) => {
                  const src = b.field_sources[g.key as string];
                  const unknown = display(b, g) === "неизвестно";
                  return (
                    <div key={g.key} className={g.key === "address" ? "sm:col-span-2" : undefined}>
                      <dt className="label-tech">{g.label}</dt>
                      <dd className={unknown ? "mt-1 text-sm text-warning-ink" : g.type === "number" ? "mt-1 font-mono text-[15px] tabular" : "mt-1 text-[15px]"}>
                        {display(b, g)}
                      </dd>
                      {src && (
                        <dd className="mt-0.5 text-[11px] text-faint">
                          {src.source || "источник не указан"} · {formatDate(src.recorded_at)}
                        </dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            )
          }
        </QueryState>
      </Card>

      <QueryState query={entries}>
        {(list) => (
          <>
            {SECTIONS.map((s) => {
              const rows = list.filter((e) => e.group === s.group);
              const known = rows.filter((e) => e.presence !== "unknown").length;
              return (
                <Card
                  key={s.group}
                  index={s.index}
                  title={s.title}
                  flush
                  actions={
                    <span className={known === rows.length ? "font-mono text-xs text-healthy-ink" : "font-mono text-xs text-muted"}>
                      описано {known} из {rows.length}
                    </span>
                  }
                >
                  <Table
                    caption={s.title}
                    rows={rows}
                    onRowClick={canEditEntries ? setEditing : undefined}
                    columns={[
                      { key: "n", primary: true, header: "Элемент", render: (e) => <span className="font-medium text-ink">{e.element_name}</span> },
                      { key: "p", header: "Наличие", render: (e) => <StatusBadge {...PRESENCE[e.presence]} /> },
                      {
                        key: "c",
                        header: "Характеристики",
                        render: (e) => (
                          <div className="min-w-[220px] text-[13px]">
                            {e.quantity !== null && <span className="mr-1.5 font-mono text-ink">{e.quantity} шт.</span>}
                            <span className={e.characteristics ? "text-ink" : "text-faint"}>
                              {e.characteristics || (e.presence === "unknown" ? "не описано" : "—")}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "d",
                        header: "Дефекты",
                        hideOnMobile: true,
                        render: (e) =>
                          e.open_defects ? (
                            <Link href={`/buildings/${id}/defects`} onClick={(ev) => ev.stopPropagation()} className="font-mono text-[13px] text-warning-ink hover:underline">
                              {e.open_defects} откр.
                            </Link>
                          ) : (
                            <span className="text-faint">—</span>
                          ),
                      },
                      {
                        key: "s",
                        header: "Источник",
                        hideOnMobile: true,
                        render: (e) =>
                          e.source ? (
                            <div className="max-w-[220px] text-[12px] leading-snug text-muted">
                              <div className="truncate" title={e.source}>{e.source}</div>
                              <div className="font-mono text-[11px] text-faint">{formatDate(e.updated_at)}</div>
                            </div>
                          ) : (
                            <span className="text-faint">—</span>
                          ),
                      },
                    ]}
                  />
                </Card>
              );
            })}
            <p className="text-xs text-faint">
              «Неизвестно» — сведения ещё не собраны; «Нет в доме» — подтверждённое отсутствие. Заполненность паспорта учитывает
              только известные значения. Расположение элементов по подъездам — на вкладке «Элементы и системы».
            </p>
          </>
        )}
      </QueryState>

      {editing && (
        <PassportEntryDialog
          key={editing.id}
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
