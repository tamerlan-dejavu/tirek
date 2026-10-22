"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api, type Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";

interface Result {
  year: number;
  reactive: number;
  preventive: number;
}

const input =
  "mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/** Spec §10: build a preliminary plan from confirmed defects and the passport-based regulation. */
export function GeneratePlan({ year }: { year: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const buildings = useApi<Paginated<Building>>(open ? "buildings/?page_size=200" : null);
  const [building, setBuilding] = useState("");
  const [target, setTarget] = useState(year);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      setResult(
        await api<Result>("work-orders/generate-plan/", {
          method: "POST",
          body: { building, year: target },
        }),
      );
      await qc.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).startsWith("work-orders/"),
      });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  if (!open)
    return (
      <Button
        variant="secondary"
        size="sm"
        icon={<Sparkles className="size-3.5" />}
        onClick={() => setOpen(true)}
      >
        Сформировать предварительный план
      </Button>
    );

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Предварительный план"
    >
      <button
        className="absolute inset-0 bg-black/60"
        aria-label="Закрыть"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-overlay)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Предварительный план работ</h2>
          <button
            onClick={() => setOpen(false)}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted">Система предложит мероприятия по данным обследования:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>
            по подтверждённым дефектам без мероприятия — с приоритетом дефекта и сроком по категории
            риска;
          </li>
          <li>
            по типовому регламенту ППР — для элементов и систем, которые есть в паспорте дома.
          </li>
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_96px]">
          <label className="block text-sm">
            <span className="text-muted">Объект</span>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className={input}
            >
              <option value="">— выберите дом —</option>
              {buildings.data?.results.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.internal_code} · {b.address}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Год</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className={`${input} font-mono`}
            />
          </label>
        </div>
        {error ? (
          <div className="mt-3">
            <ErrorState error={error} />
          </div>
        ) : null}
        {result && (
          <p className="mt-3 rounded-md bg-healthy-soft px-3 py-2 text-sm text-healthy-ink">
            {result.reactive + result.preventive === 0
              ? "Новых мероприятий нет — план уже актуален."
              : `Добавлено: по дефектам — ${result.reactive}, по регламенту — ${result.preventive}. Все в статусе «Предложено».`}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Button disabled={!building || pending} onClick={run}>
            {pending ? "Формирование…" : "Сформировать"}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Готово
          </Button>
        </div>
        <p className="mt-4 text-[11px] text-faint">
          Повторный запуск не создаёт дублей. Мероприятия согласует ОСИ, сроки и исполнителей
          назначает ПТО.
        </p>
      </div>
    </div>
  );
}
