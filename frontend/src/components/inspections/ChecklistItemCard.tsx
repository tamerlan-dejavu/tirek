"use client";

import clsx from "clsx";
import { Camera, Check, CircleAlert, CloudOff, LoaderCircle, Minus, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAutosave } from "@/hooks/useAutosave";
import { api } from "@/lib/api/client";
import type { ChecklistItem, InspectionAnswer } from "@/lib/api/types";

const COMPLIANCE = [
  { value: "ok", label: "Соответствует", icon: Check, on: "border-healthy bg-healthy-soft text-healthy-ink" },
  { value: "fail", label: "Не соответствует", icon: X, on: "border-critical bg-critical-soft text-critical-ink" },
  { value: "na", label: "Неприменимо", icon: Minus, on: "border-unknown bg-unknown-soft text-unknown-ink" },
] as const;

type Draft = Pick<InspectionAnswer, "compliance" | "number_value" | "text_value" | "date_value" | "choice_value" | "comment">;

function isFilled(d: Draft) {
  return !!(d.compliance || d.text_value || d.choice_value || d.date_value || d.number_value !== null);
}

/** One checklist item: large touch targets, autosaved to the server (ТЗ 11.7). */
export function ChecklistItemCard({
  inspectionId,
  buildingId,
  item,
  answer,
  index,
  onFilledChange,
  onCreateDefect,
}: {
  inspectionId: string;
  buildingId: string;
  item: ChecklistItem;
  answer?: InspectionAnswer;
  index: number;
  onFilledChange: (itemId: string, filled: boolean) => void;
  onCreateDefect: (answerId: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    compliance: answer?.compliance ?? "",
    number_value: answer?.number_value ?? null,
    text_value: answer?.text_value ?? "",
    date_value: answer?.date_value ?? null,
    choice_value: answer?.choice_value ?? "",
    comment: answer?.comment ?? "",
  });
  const [answerId, setAnswerId] = useState(answer?.id);
  const [photos, setPhotos] = useState(0);
  const [uploading, setUploading] = useState(false);

  const state = useAutosave(draft, async (d) => {
    const saved = await api<InspectionAnswer>("inspection-answers/", {
      method: "POST",
      body: { inspection: inspectionId, item: item.id, ...d },
    });
    setAnswerId(saved.id);
  });

  const filled = isFilled(draft);
  useEffect(() => onFilledChange(item.id, filled), [filled, item.id, onFilledChange]);
  const missingRequired = item.is_required && !filled;

  async function attachPhoto(file: File) {
    if (!answerId) return;
    const form = new FormData();
    form.append("file", file);
    form.append("building", buildingId);
    form.append("target_type", "inspection_answer");
    form.append("target_id", answerId);
    setUploading(true);
    try {
      await api("files/upload/", { method: "POST", body: form });
      setPhotos((n) => n + 1);
    } finally {
      setUploading(false);
    }
  }

  return (
    <article
      id={`item-${item.id}`}
      className={clsx(
        "scroll-mt-32 rounded-lg border bg-surface",
        draft.compliance === "fail" ? "border-critical/50" : missingRequired ? "border-line-strong" : "border-line",
      )}
      aria-labelledby={`item-title-${item.id}`}
    >
      <header className="flex items-start gap-3 px-4 pt-4">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[10px] text-muted">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted">{item.code}</span>
            {item.is_required && <span className="font-mono text-[10px] text-warning-ink uppercase">обяз.</span>}
          </div>
          <h3 id={`item-title-${item.id}`} className="mt-0.5 text-[15px] leading-snug font-medium text-ink">
            {item.text}
          </h3>
          {item.guidance && <p className="mt-1 text-sm text-muted">{item.guidance}</p>}
        </div>
        <SaveIndicator state={state} />
      </header>

      <div className="px-4 pt-3">
        {item.answer_type === "compliance" && (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Результат проверки">
            {COMPLIANCE.map((o) => {
              const Icon = o.icon;
              const on = draft.compliance === o.value;
              return (
                <button
                  key={o.value}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDraft({ ...draft, compliance: on ? "" : o.value })}
                  className={clsx(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border px-1 text-[12.5px] leading-tight transition-colors",
                    on ? o.on : "border-line text-ink active:bg-mist",
                  )}
                >
                  <Icon aria-hidden className="size-4" strokeWidth={2.4} />
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
        {item.answer_type === "number" && (
          <label className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={draft.number_value ?? ""}
              onChange={(e) => setDraft({ ...draft, number_value: e.target.value || null })}
              className="h-12 w-40 rounded-md border border-line px-3 font-mono text-lg tabular focus:border-accent focus:outline-none"
              aria-label={`${item.text}, ${item.unit}`}
            />
            <span className="font-mono text-sm text-muted">{item.unit}</span>
          </label>
        )}
        {item.answer_type === "text" && (
          <textarea
            value={draft.text_value}
            onChange={(e) => setDraft({ ...draft, text_value: e.target.value })}
            className="min-h-20 w-full rounded-md border border-line p-3 text-[15px] focus:border-accent focus:outline-none"
            aria-label={item.text}
          />
        )}
        {item.answer_type === "date" && (
          <input type="date" value={draft.date_value ?? ""} onChange={(e) => setDraft({ ...draft, date_value: e.target.value || null })} className="h-12 rounded-md border border-line px-3" aria-label={item.text} />
        )}
        {item.answer_type === "choice" && (
          <select value={draft.choice_value} onChange={(e) => setDraft({ ...draft, choice_value: e.target.value })} className="h-12 w-full rounded-md border border-line bg-surface px-2" aria-label={item.text}>
            <option value="">—</option>
            {item.choices.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      <div className="px-4 pt-3">
        <input
          value={draft.comment}
          onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          placeholder="Комментарий (необязательно)"
          aria-label="Комментарий"
          className="h-11 w-full rounded-md border border-line px-3 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <label
          className={clsx(
            "inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium",
            answerId ? "border-line-strong text-ink active:bg-mist" : "cursor-not-allowed border-line text-faint",
          )}
          title={answerId ? undefined : "Сначала отметьте результат проверки"}
        >
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Фото{photos > 0 && <span className="font-mono text-xs text-accent-strong">+{photos}</span>}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={!answerId || uploading}
            onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])}
          />
        </label>
        {draft.compliance === "fail" && answerId && (
          <button onClick={() => onCreateDefect(answerId)} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-button)] border border-critical/50 bg-critical-soft px-4 text-sm font-medium text-critical-ink transition-colors hover:border-critical">
            <TriangleAlert className="size-4" /> Зафиксировать дефект
          </button>
        )}
        {missingRequired && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-warning-ink">
            <CircleAlert className="size-3.5" /> не заполнено
          </span>
        )}
      </footer>
    </article>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const map = {
    saving: { icon: <LoaderCircle className="size-3.5 animate-spin" />, text: "Сохранение", cls: "text-muted" },
    saved: { icon: <Check className="size-3.5" />, text: "Сохранено", cls: "text-healthy-ink" },
    error: { icon: <CloudOff className="size-3.5" />, text: "Нет связи", cls: "text-critical-ink" },
  } as const;
  const s = map[state];
  return (
    <span role="status" className={clsx("inline-flex shrink-0 items-center gap-1 text-[11px]", s.cls)}>
      {s.icon}
      {s.text}
    </span>
  );
}
