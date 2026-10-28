"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { useMe } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";
import { BUILDING_TYPE, GENERAL_FIELDS_BY_TYPE, PASSPORT_FIELD, STRUCTURAL_SCHEME } from "@/lib/status";

const input = "mt-1.5 h-11 w-full rounded-md border border-line bg-surface px-3 text-[15px] focus:border-accent focus:outline-none";
const label = "block text-sm font-medium text-ink";

/**
 * UC-01: the provider administrator creates a building. The type comes first — it defines the
 * passport fields, the element classifier and the checklist templates (ТЗ 5.3). Unknown values
 * stay empty («неизвестно»): nothing is invented.
 */
export default function NewBuildingPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const providers = (me?.memberships ?? []).filter((m) => m.organization_type === "provider" && m.role === "provider_admin");
  const [type, setType] = useState("residential");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fields = GENERAL_FIELDS_BY_TYPE[type].filter((k) => k !== "address");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      building_type: type,
      internal_code: f.get("internal_code"),
      name: f.get("name"),
      address: f.get("address"),
      city: f.get("city"),
      provider_organization: f.get("provider_organization") || providers[0]?.organization,
    };
    for (const k of fields) {
      const raw = String(f.get(k) ?? "").trim();
      body[k] = PASSPORT_FIELD[k].type === "number" ? (raw === "" ? null : raw) : raw || (PASSPORT_FIELD[k].type === "scheme" ? "unknown" : raw);
    }
    setPending(true);
    setError(null);
    try {
      const b = await api<Building>("buildings/", { method: "POST", body });
      router.replace(`/buildings/${b.id}/passport`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6 pb-10">
      <PageHeader code="Реестр объектов · новое здание" title="Новое здание" subtitle="Тип здания определяет поля паспорта, классификатор элементов и шаблоны чек-листов." />
      {error ? <ErrorState error={error} /> : null}

      <Card index="1" title="Тип здания">
        <div role="radiogroup" aria-label="Тип здания" className="grid gap-2 sm:grid-cols-2">
          {Object.entries(BUILDING_TYPE).map(([k, v]) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={type === k}
              onClick={() => setType(k)}
              className={
                type === k
                  ? "min-h-12 rounded-md border border-accent bg-accent-soft px-3 text-left text-sm text-ink"
                  : "min-h-12 rounded-md border border-line px-3 text-left text-sm text-muted hover:border-line-strong hover:text-ink"
              }
            >
              {v}
            </button>
          ))}
        </div>
      </Card>

      <Card index="2" title="Идентификация">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Внутренний идентификатор
            <input name="internal_code" required placeholder="ALM-0301" className={`${input} font-mono`} />
          </label>
          <label className={label}>
            Город
            <input name="city" defaultValue="Алматы" className={input} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Адрес
            <input name="address" required className={input} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Наименование <span className="font-normal text-muted">(необязательно)</span>
            <input name="name" className={input} />
          </label>
          {providers.length > 1 && (
            <label className={`${label} sm:col-span-2`}>
              Обслуживающая организация
              <select name="provider_organization" className={input}>
                {providers.map((p) => (
                  <option key={p.organization} value={p.organization}>
                    {p.organization_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Card>

      <Card index="3" title="Общие сведения паспорта">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((k) => {
            const meta = PASSPORT_FIELD[k];
            return (
              <label key={`${type}-${k}`} className={label}>
                {meta.label}
                {meta.unit ? `, ${meta.unit}` : ""}
                {meta.type === "scheme" ? (
                  <select name={k} defaultValue="unknown" className={input}>
                    {Object.entries(STRUCTURAL_SCHEME).map(([v, t]) => (
                      <option key={v} value={v}>
                        {v === "unknown" ? "Неизвестно" : t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name={k} type={meta.type === "number" ? "number" : "text"} min={0} step="any" placeholder="неизвестно" className={`${input} ${meta.type === "number" ? "font-mono" : ""}`} />
                )}
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Пустое поле сохраняется как «неизвестно». Элементы и системы здания заполняются в паспорте после создания.</p>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={pending || providers.length === 0} icon={pending ? <LoaderCircle className="size-4 animate-spin" /> : undefined}>
        {pending ? "Создание…" : "Создать здание"}
      </Button>
      {providers.length === 0 && <p className="text-sm text-warning-ink">Создавать здания может администратор обслуживающей организации.</p>}
    </form>
  );
}
