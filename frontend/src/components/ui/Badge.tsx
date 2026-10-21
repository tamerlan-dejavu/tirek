import clsx from "clsx";
import type { ReactNode } from "react";

import type { RiskCategory } from "@/lib/api/types";
import { RISK } from "@/lib/status";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

const RISK_CLASS: Record<RiskCategory, string> = {
  R1: "border-risk-r1 text-risk-r1 bg-risk-r1/10",
  R2: "border-risk-r2 text-risk-r2 bg-risk-r2/10",
  R3: "border-risk-r3 text-risk-r3 bg-risk-r3/10",
  R4: "border-risk-r4 text-risk-r4 bg-risk-r4/10",
};

/** Approved risk: solid. Preliminary severity: dashed + «предварительно» (ТЗ 11.6). */
export function RiskBadge({
  category,
  preliminary = false,
}: {
  category: RiskCategory | null | "";
  preliminary?: boolean;
}) {
  if (!category) return <Badge className="border-line text-ink-muted">без оценки</Badge>;
  return (
    <Badge className={clsx(RISK_CLASS[category], preliminary && "border-dashed bg-transparent")}>
      <span className="font-mono">{category}</span>
      <span className="sr-only">{RISK[category].label}</span>
      {preliminary && <span>· предварительно</span>}
    </Badge>
  );
}

export function ApprovalTag({ approved }: { approved: boolean }) {
  return approved ? (
    <Badge className="border-approved text-approved">утверждено</Badge>
  ) : (
    <Badge className="border-preliminary border-dashed text-preliminary">предварительно</Badge>
  );
}

export function StatusBadge({ label }: { label: string }) {
  return <Badge className="border-line bg-surface text-ink">{label}</Badge>;
}
