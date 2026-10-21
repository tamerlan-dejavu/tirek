import clsx from "clsx";

import { formatMonth } from "@/lib/status";

/**
 * Engineering charts: thin lines, exact values on hover and in text, no 3D, no gradients.
 * Each chart states its unit and period; empty datasets render an explicit "нет данных".
 */

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
  note?: string;
}

/** Horizontal bars with exact values — the default for categorical comparisons. */
export function BarList({ data, unit = "", max }: { data: BarDatum[]; unit?: string; max?: number }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-muted">Нет данных за период.</p>;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink">{d.label}</span>
            <span className="font-mono tabular text-ink">
              {d.value}
              {unit && <span className="ml-0.5 text-muted">{unit}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-mist" role="presentation">
            <div
              className="h-full rounded-full transition-[width] duration-[var(--duration-slow)]"
              style={{ width: `${(d.value / top) * 100}%`, background: d.color ?? "var(--color-steel)" }}
            />
          </div>
          {d.note && <div className="mt-0.5 text-[11px] text-muted">{d.note}</div>}
        </li>
      ))}
    </ul>
  );
}

/** Single stacked bar of a whole, with a legend that carries the numbers. */
export function StackedBar({ data, label }: { data: BarDatum[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-mist" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d) => (
              <div key={d.key} style={{ width: `${(d.value / total) * 100}%`, background: d.color }} className="h-full border-r border-surface last:border-0" />
            ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span aria-hidden className={clsx("size-2 shrink-0 rounded-[2px]", !d.color && "border border-dashed border-unknown")} style={{ background: d.color }} />
            <span className="truncate text-muted">{d.label}</span>
            <span className="ml-auto font-mono tabular text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Monthly columns: detected vs closed defects. Exact values in <title> for hover and SR. */
export function MonthlyColumns({ data }: { data: { month: string; detected: number; closed: number }[] }) {
  const W = 640;
  const H = 180;
  const padB = 22;
  const padL = 26;
  const max = Math.max(1, ...data.flatMap((d) => [d.detected, d.closed]));
  const step = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(10, step / 3.2);
  const y = (v: number) => H - padB - (v / max) * (H - padB - 10);
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));
  const empty = data.every((d) => !d.detected && !d.closed);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Выявлено и закрыто дефектов по месяцам">
        {ticks.map((t) => (
          <g key={t}>
            <path d={`M${padL} ${y(t)}H${W}`} stroke="var(--color-line)" strokeWidth="0.8" strokeDasharray={t ? "3 3" : undefined} />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-muted)">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + step * (i + 0.5);
          return (
            <g key={d.month}>
              <rect x={cx - bw - 1} y={y(d.detected)} width={bw} height={H - padB - y(d.detected)} fill="var(--color-steel)">
                <title>{`${d.month}: выявлено ${d.detected}`}</title>
              </rect>
              <rect x={cx + 1} y={y(d.closed)} width={bw} height={H - padB - y(d.closed)} fill="var(--color-teal)">
                <title>{`${d.month}: закрыто ${d.closed}`}</title>
              </rect>
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-muted)">
                {formatMonth(d.month)}
              </text>
            </g>
          );
        })}
        {empty && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
            нет данных за период
          </text>
        )}
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-steel" /> выявлено
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-teal" /> закрыто
        </span>
        <span className="ml-auto">шт. · 12 мес.</span>
      </figcaption>
    </figure>
  );
}
