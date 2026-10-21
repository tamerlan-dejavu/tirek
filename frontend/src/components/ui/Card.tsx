import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Panel — the basic drawing sheet. Optional technical index ("02") and registration marks
 * on the corners give every screen the feel of an engineering document.
 */
export function Card({
  title,
  index,
  actions,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode;
  index?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}) {
  return (
    <section className={clsx("registration rounded-lg border border-line bg-surface shadow-[var(--shadow-hairline)]", className)}>
      {(title || actions) && (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
          <h2 className="flex items-baseline gap-2.5 text-sm font-semibold tracking-[-0.005em]">
            {index && <span className="font-mono text-[11px] font-normal text-faint">{index}</span>}
            {title}
          </h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(flush ? "" : "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Metric — a count with an explicit definition. No composite scores (ТЗ 11.4, brief §13).
 */
export function Stat({
  label,
  value,
  definition,
  tone,
  href,
  icon,
}: {
  label: string;
  value: number | string;
  definition?: string;
  tone?: "critical" | "warning" | "healthy";
  href?: string;
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "critical" && Number(value) > 0
      ? "text-critical-ink"
      : tone === "warning" && Number(value) > 0
        ? "text-warning-ink"
        : tone === "healthy"
          ? "text-healthy-ink"
          : "text-ink";
  const body = (
    <>
      <div className="flex min-h-8 items-start justify-between gap-2">
        <span className="label-tech">{label}</span>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className={clsx("mt-2 font-mono text-[28px] leading-none font-medium tabular tracking-tight", toneClass)}>
        {value}
      </div>
      {definition && <p className="mt-2 text-[11.5px] leading-snug text-muted">{definition}</p>}
    </>
  );
  const cls =
    "group block rounded-lg border border-line bg-surface p-4 transition-colors duration-[var(--duration-fast)]";
  return href ? (
    <Link href={href} className={clsx(cls, "hover:border-teal/60")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Page header in technical-document style: section code, title, scope line, actions. */
export function PageHeader({
  title,
  code,
  subtitle,
  actions,
  meta,
}: {
  title: ReactNode;
  code?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-line pb-5">
      {code && <div className="label-tech mb-2">{code}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em] text-ink md:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">{meta}</div>}
    </div>
  );
}

/** Key–value pair used in headers and passports: label-tech over a value. */
export function Field({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="label-tech">{label}</div>
      <div className={clsx("mt-0.5 text-sm break-words text-ink", mono && "font-mono tabular")}>{children}</div>
    </div>
  );
}
