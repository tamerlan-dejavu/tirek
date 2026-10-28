"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ClipboardPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building, Inspection } from "@/lib/api/types";

interface Options {
  building_type: string;
  organizations: { id: string; name: string; assignees: { id: string; name: string; position: string }[] }[];
  templates: { version: string; organization: string; name: string }[];
}

const input = "mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/**
 * UC-02: building, published checklist of the building's type, field specialist, planned date.
 * The server checks the executor and the template type; the form only offers valid choices.
 */
export function AssignInspection({ buildingId }: { buildingId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [building, setBuilding] = useState(buildingId ?? "");
  const [org, setOrg] = useState("");
  const buildings = useApi<Paginated<Building>>(open && !buildingId ? "buildings/?page_size=200" : null);
  const options = useApi<Options>(open && building ? `inspections/planning-options/?building=${building}` : null);
  const orgId = org || options.data?.organizations[0]?.id || "";
  const current = options.data?.organizations.find((o) => o.id === orgId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const i = await api<Inspection>("inspections/", {
        method: "POST",
        body: {
          building,
          provider_organization: orgId,
          template_version: f.get("template_version"),
          assignee: f.get("assignee"),
          planned_date: f.get("planned_date") || null,
        },
      });
      await qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("inspections/") });
      router.push(`/inspections/${i.id}`);
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  if (!open)
    return (
      <Button size="sm" icon={<ClipboardPlus className="size-3.5" />} onClick={() => setOpen(true)}>
        Назначить обследование
      </Button>
    );

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Назначить обследование">
      <button className="absolute inset-0 bg-black/60" aria-label="Закрыть" onClick={() => setOpen(false)} />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-overlay)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Назначить обследование</h2>
          <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink" aria-label="Закрыть">
            <X className="size-4" />
          </button>
        </div>
        {error ? (
          <div className="mb-3">
            <ErrorState error={error} />
          </div>
        ) : null}
        <div className="space-y-3">
          {!buildingId && (
            <label className="block text-sm">
              <span className="text-muted">Здание</span>
              <select value={building} onChange={(e) => setBuilding(e.target.value)} required className={input}>
                <option value="">— выберите —</option>
                {buildings.data?.results.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.internal_code} · {b.address}
                  </option>
                ))}
              </select>
            </label>
          )}
          {options.data && options.data.organizations.length > 1 && (
            <label className="block text-sm">
              <span className="text-muted">Обслуживающая организация</span>
              <select value={orgId} onChange={(e) => setOrg(e.target.value)} className={input}>
                {options.data.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-muted">Чек-лист (опубликованная версия)</span>
            <select name="template_version" required disabled={!options.data} className={input}>
              <option value="">— выберите —</option>
              {options.data?.templates
                .filter((t) => t.organization === orgId)
                .map((t) => (
                  <option key={t.version} value={t.version}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          {options.data && !options.data.templates.some((t) => t.organization === orgId) && (
            <p className="text-xs text-warning-ink">Нет опубликованного шаблона для этого типа здания. Шаблоны жилых и коммерческих зданий не смешиваются.</p>
          )}
          <label className="block text-sm">
            <span className="text-muted">Исполнитель</span>
            <select name="assignee" required disabled={!current} className={input}>
              <option value="">— выберите —</option>
              {current?.assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.position ? ` · ${a.position}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Плановая дата</span>
            <input name="planned_date" type="date" className={`${input} font-mono`} />
          </label>
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="submit" disabled={pending || !options.data}>
            {pending ? "Создание…" : "Назначить"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-faint">Исполнитель получит доступ к зданию и увидит обследование в своём списке.</p>
      </form>
    </div>
  );
}
