"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import type { PassportEntry, Presence } from "@/lib/api/types";
import { PRESENCE } from "@/lib/status";

const input = "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/** Edit one passport line: presence, quantity, characteristics, and where the data came from. */
export function PassportEntryDialog({ entry, onClose, onSaved }: { entry: PassportEntry; onClose: () => void; onSaved: () => void }) {
  const [presence, setPresence] = useState<Presence>(entry.presence);
  const [quantity, setQuantity] = useState(entry.quantity?.toString() ?? "");
  const [characteristics, setCharacteristics] = useState(entry.characteristics);
  const [source, setSource] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api(`passport-entries/${entry.id}/`, {
        method: "PATCH",
        body: {
          presence,
          quantity: presence === "present" && quantity ? Number(quantity) : null,
          characteristics: presence === "unknown" ? "" : characteristics,
          source,
        },
      });
      onSaved();
    } catch (err) {
      setError(err);
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={entry.element_name}>
      <button className="absolute inset-0 bg-black/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-t-xl border border-line bg-surface shadow-[var(--shadow-overlay)] sm:rounded-xl">
        <div className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <div className="label-tech">Цифровой паспорт</div>
            <h2 className="mt-1 text-lg font-semibold">{entry.element_name}</h2>
          </div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink" aria-label="Закрыть">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div role="radiogroup" aria-label="Наличие" className="grid grid-cols-3 gap-2">
            {(Object.keys(PRESENCE) as Presence[]).map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={presence === p}
                onClick={() => setPresence(p)}
                className={clsx(
                  "h-11 rounded-md border text-sm transition-colors",
                  presence === p ? "border-accent bg-accent-soft text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink",
                )}
              >
                {PRESENCE[p].label}
              </button>
            ))}
          </div>
          {presence === "present" && (
            <label className="block text-sm">
              <span className="text-muted">Количество (если применимо)</span>
              <input type="number" min={0} inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${input} mt-1 font-mono`} />
            </label>
          )}
          {presence !== "unknown" && (
            <label className="block text-sm">
              <span className="text-muted">{presence === "absent" ? "Пояснение" : "Характеристики"}</span>
              <textarea
                value={characteristics}
                onChange={(e) => setCharacteristics(e.target.value)}
                placeholder={presence === "absent" ? "Например: бескаркасная панельная схема" : "Материал, тип, год ввода или ремонта, мощность…"}
                className="mt-1 min-h-24 w-full rounded-md border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="text-muted">Источник сведений</span>
            <input required value={source} onChange={(e) => setSource(e.target.value)} placeholder="Техпаспорт БТИ, проектная документация, осмотр 22.10…" className={`${input} mt-1`} />
          </label>
          {error ? <ErrorState error={error} /> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={save} disabled={pending || !source.trim()}>
              Сохранить
            </Button>
          </div>
          <p className="text-xs text-faint">Прежнее значение сохранится в истории изменений.</p>
        </div>
      </div>
    </div>
  );
}
