"use client";

import clsx from "clsx";
import { useState } from "react";

import { useAutosave } from "@/hooks/useAutosave";
import { api } from "@/lib/api/client";
import type { ChecklistItem, InspectionAnswer } from "@/lib/api/types";

const COMPLIANCE = [
  { value: "ok", label: "Соответствует" },
  { value: "fail", label: "Не соответствует" },
  { value: "na", label: "Неприменимо" },
] as const;

type Draft = Pick<InspectionAnswer, "compliance" | "number_value" | "text_value" | "date_value" | "choice_value" | "comment">;

const SAVE_LABEL = { idle: "", saving: "Сохранение…", saved: "Сохранено", error: "Не сохранено — повторите" };

/** One checklist item, large touch targets, autosaved to the server (ТЗ 11.7). */
export function ChecklistItemCard({ inspectionId, buildingId, item, answer, onCreateDefect }: {
  inspectionId: string;
  buildingId: string;
  item: ChecklistItem;
  answer?: InspectionAnswer;
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

  const state = useAutosave(draft, async (d) => {
    const saved = await api<InspectionAnswer>("inspection-answers/", {
      method: "POST",
      body: { inspection: inspectionId, item: item.id, ...d },
    });
    setAnswerId(saved.id);
  });

  const unanswered = item.is_required && !draft.compliance && !draft.text_value && draft.number_value === null;

  async function attachPhoto(file: File) {
    if (!answerId) return;
    const form = new FormData();
    form.append("file", file);
    form.append("building", buildingId);
    form.append("target_type", "inspection_answer");
    form.append("target_id", answerId);
    await api("files/upload/", { method: "POST", body: form });
  }

  return (
    <article
      className={clsx("rounded-sm border bg-surface p-4", unanswered ? "border-preliminary border-dashed" : "border-line")}
      aria-labelledby={`item-${item.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 id={`item-${item.id}`} className="font-medium">
          <span className="mr-2 font-mono text-ink-muted">{item.code}</span>
          {item.text}
          {item.is_required && <span className="sr-only"> (обязательный)</span>}
        </h3>
        <span role="status" className="text-xs text-ink-muted">{SAVE_LABEL[state]}</span>
      </header>
      {item.guidance && <p className="mt-1 text-sm text-ink-muted">{item.guidance}</p>}

      <div className="mt-3">
        {item.answer_type === "compliance" && (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Результат проверки">
            {COMPLIANCE.map((o) => (
              <button
                key={o.value}
                role="radio"
                aria-checked={draft.compliance === o.value}
                onClick={() => setDraft({ ...draft, compliance: o.value })}
                className={clsx(
                  "min-h-12 rounded-sm border px-2 text-sm",
                  draft.compliance === o.value
                    ? o.value === "fail" ? "border-risk-r1 bg-risk-r1/10 text-risk-r1" : "border-accent bg-accent/10 text-accent"
                    : "border-line",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {item.answer_type === "number" && (
          <label className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={draft.number_value ?? ""}
              onChange={(e) => setDraft({ ...draft, number_value: e.target.value || null })}
              className="min-h-12 w-40 rounded-sm border border-line px-3 font-mono"
            />
            <span className="text-sm text-ink-muted">{item.unit}</span>
          </label>
        )}
        {item.answer_type === "text" && (
          <textarea
            value={draft.text_value}
            onChange={(e) => setDraft({ ...draft, text_value: e.target.value })}
            className="min-h-20 w-full rounded-sm border border-line p-2 text-sm"
          />
        )}
        {item.answer_type === "date" && (
          <input
            type="date"
            value={draft.date_value ?? ""}
            onChange={(e) => setDraft({ ...draft, date_value: e.target.value || null })}
            className="min-h-12 rounded-sm border border-line px-3"
          />
        )}
        {item.answer_type === "choice" && (
          <select
            value={draft.choice_value}
            onChange={(e) => setDraft({ ...draft, choice_value: e.target.value })}
            className="min-h-12 w-full rounded-sm border border-line px-2"
          >
            <option value="">—</option>
            {item.choices.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
      </div>

      <input
        value={draft.comment}
        onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
        placeholder="Комментарий"
        aria-label="Комментарий"
        className="mt-3 min-h-10 w-full rounded-sm border border-line px-3 text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-sm border border-line px-4 text-sm">
          Фото
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={!answerId}
            onChange={(e) => e.target.files?.[0] && attachPhoto(e.target.files[0])}
          />
        </label>
        {draft.compliance === "fail" && answerId && (
          <button onClick={() => onCreateDefect(answerId)} className="min-h-12 rounded-sm border border-risk-r1 px-4 text-sm text-risk-r1">
            Создать дефект
          </button>
        )}
      </div>
    </article>
  );
}
