import clsx from "clsx";
import { Check, Circle, Diamond, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import type { RiskCategory } from "@/lib/api/types";
import { RISK, type Tone } from "@/lib/status";

/* ---------------------------------------------------------------------------------------------
 * SEVERITY — expert risk category. Encoded three ways: color, shape icon, 4-segment meter.
 * Approved: solid. Preliminary (field estimate, not approved): dashed outline + «предв.».
 * ------------------------------------------------------------------------------------------ */

const RISK_STYLE: Record<RiskCategory, { text: string; seg: string; icon: typeof Circle }> = {
  R1: { text: "text-critical-ink", seg: "bg-r1", icon: OctagonAlert },
  R2: { text: "text-warning-ink", seg: "bg-r2", icon: TriangleAlert },
  R3: { text: "text-info-ink", seg: "bg-r3", icon: Diamond },
  R4: { text: "text-unknown-ink", seg: "bg-r4", icon: Circle },
};

export function SeverityMeter({
  category,
  className,
}: {
  category: RiskCategory;
  className?: string;
}) {
  const level = RISK[category].level;
  return (
    <span aria-hidden className={clsx("inline-flex items-end gap-[2px]", className)}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={clsx(
            "w-[3px] rounded-[1px]",
            i <= level ? RISK_STYLE[category].seg : "bg-line",
          )}
          style={{ height: 4 + i * 2 }}
        />
      ))}
    </span>
  );
}

export function RiskBadge({
  category,
  preliminary = false,
  size = "md",
}: {
  category: RiskCategory | null | "";
  preliminary?: boolean;
  size?: "sm" | "md";
}) {
  if (!category) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-dashed border-line-strong px-1.5 py-0.5 text-xs text-muted">
        <span className="font-mono">R—</span> без оценки
      </span>
    );
  }
  const s = RISK_STYLE[category];
  const Icon = s.icon;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-sm border bg-surface font-medium whitespace-nowrap",
        size === "sm" ? "px-1 py-px text-[11px]" : "px-1.5 py-0.5 text-xs",
        preliminary ? "border-dashed border-line-strong" : "border-line",
        s.text,
      )}
      title={
        preliminary ? `${RISK[category].label} — предварительная оценка` : RISK[category].label
      }
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.2} />
      <span className="font-mono">{category}</span>
      {size === "md" && <span className="font-normal text-ink">{RISK[category].short}</span>}
      {preliminary && <span className="font-normal text-muted">· предв.</span>}
      <span className="sr-only">
        {preliminary ? ", предварительная оценка" : ", утверждённая оценка"}
      </span>
      {size === "md" && <SeverityMeter category={category} className="ml-0.5" />}
    </span>
  );
}

/* ---------------------------------------------------------------------------------------------
 * STATUS — workflow position. Neutral chip with a tone dot; never filled with severity colors.
 * ------------------------------------------------------------------------------------------ */

const DOT: Record<Tone, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  healthy: "bg-healthy",
  info: "bg-info",
  accent: "bg-accent",
  neutral: "bg-unknown",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-0.5 text-xs whitespace-nowrap text-ink">
      <span aria-hidden className={clsx("size-1.5 rounded-full", DOT[tone])} />
      {label}
    </span>
  );
}

/** Approved engineering conclusion vs preliminary observation (ТЗ 9.7, 11.6). */
export function ApprovalTag({ approved, children }: { approved: boolean; children?: ReactNode }) {
  return approved ? (
    <span className="inline-flex items-center gap-1 rounded-sm bg-healthy-soft px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-healthy-ink">
      <Check aria-hidden className="size-3" strokeWidth={2.5} />
      {children ?? "Утверждено"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-sm border border-dashed border-warning px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-warning-ink">
      {children ?? "Предварительно"}
    </span>
  );
}

/** Marks demo/mock content so it is never mistaken for real findings. */
export function DemoMark() {
  return (
    <span className="label-tech rounded-sm border border-dashed border-line-strong px-1 !text-[10px]">
      демо-данные
    </span>
  );
}
