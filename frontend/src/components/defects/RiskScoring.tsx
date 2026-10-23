"use client";

import { useEffect } from "react";

import { RiskBadge } from "@/components/ui/Badge";
import { useApi } from "@/lib/api/hooks";
import type { RiskCategory } from "@/lib/api/types";

export type Factor = "probability" | "consequences" | "condition" | "service_life";
export type Factors = Partial<Record<Factor, number>>;

interface Methodology {
  status: string;
  formula: string;
  scales: Record<Factor, { label: string; levels: Record<string, string> }>;
  thresholds: { min_score: number; category: RiskCategory }[];
  response: Record<RiskCategory, { label: string; action: string; days: number }>;
  age_bands: { under_years: number | null; level: number }[];
}

const FACTORS: Factor[] = ["probability", "consequences", "condition", "service_life"];

export function scoreOf(f: Factors): number | null {
  return FACTORS.every((k) => f[k]) ? FACTORS.reduce((acc, k) => acc * (f[k] as number), 1) : null;
}

/**
 * Scoring aid (spec §9): four 1–5 factors → product → suggested R-level.
 * The suggestion never decides on its own: the engineer picks the category, an override is shown.
 */
export function RiskScoring({
  value,
  onChange,
  yearBuilt,
  chosen,
  onSuggest,
}: {
  value: Factors;
  onChange: (f: Factors) => void;
  yearBuilt: number | null | undefined;
  chosen: RiskCategory;
  onSuggest: (c: RiskCategory) => void;
}) {
  const { data: m } = useApi<Methodology>("risk-assessments/methodology/");
  const score = scoreOf(value);
  const suggested = m && score ? m.thresholds.find((t) => score >= t.min_score)?.category : undefined;

  // Pre-fill service life from the building age — the engineer can change it
  useEffect(() => {
    if (!m || !yearBuilt || value.service_life) return;
    const age = new Date().getFullYear() - yearBuilt;
    const band = m.age_bands.find((b) => b.under_years === null || age < b.under_years);
    if (band) onChange({ ...value, service_life: band.level });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, yearBuilt]);

  // Follow the suggestion while the factors change; the engineer overrides afterwards
  useEffect(() => {
    if (suggested) onSuggest(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested]);

  if (!m) return null;
  return (
    <div className="space-y-2.5 rounded-md border border-line p-3">
      <div className="label-tech">Расчёт риска · {m.formula}</div>
      {FACTORS.map((k) => (
        <label key={k} className="block text-xs text-muted">
          {m.scales[k].label}
          <select
            value={value[k] ?? ""}
            onChange={(e) => onChange({ ...value, [k]: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">— не оценено —</option>
            {Object.entries(m.scales[k].levels).map(([lvl, text]) => (
              <option key={lvl} value={lvl}>
                {lvl} · {text}
              </option>
            ))}
          </select>
        </label>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="font-mono text-sm">
          Балл: <span className="text-ink">{score ?? "—"}</span>
          <span className="text-faint"> / 625</span>
        </span>
        {suggested && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            Предложено <RiskBadge category={suggested} size="sm" />
          </span>
        )}
      </div>
      {suggested && <p className="text-xs text-muted">{m.response[suggested].action}</p>}
      {suggested && chosen !== suggested && (
        <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning-ink">
          Категория {chosen} отличается от расчётной {suggested}. Решение инженера будет записано как отступление от расчёта — поясните в обосновании.
        </p>
      )}
      <p className="text-[11px] text-faint">{m.status}. Расчёт — подсказка, категорию утверждает инженер.</p>
    </div>
  );
}
