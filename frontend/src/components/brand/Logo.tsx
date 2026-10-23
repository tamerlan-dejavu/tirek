import clsx from "clsx";

/**
 * Tirek mark: a building section on a structural axis. «Тірек» (kaz.) — support, pillar.
 * Three floor slabs carried by one column; the accent slab marks the inspected level.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("shrink-0", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="6" className="fill-surface stroke-line" />
      <path d="M16 6v20" className="stroke-faint" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M8 10h16M8 16h16" className="stroke-ink" strokeWidth="2" strokeLinecap="square" />
      <path d="M8 22h16" className="stroke-accent" strokeWidth="2" strokeLinecap="square" />
      <path d="M10 10v12M22 10v12" className="stroke-muted" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span className="font-display text-[15px] font-bold tracking-[0.2em] text-ink">TIREK</span>
    </span>
  );
}
