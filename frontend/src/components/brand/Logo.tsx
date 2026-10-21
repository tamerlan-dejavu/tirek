import clsx from "clsx";

/**
 * Tirek mark: a building section on a structural axis. «Тірек» (kaz.) — support, pillar.
 * Three floor slabs carried by one column; the teal slab marks the inspected level.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("shrink-0", className)} aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="6" className="fill-navy stroke-white/10" />
      <path d="M16 6v20" className="stroke-white/35" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M8 10h16M8 16h16" className="stroke-white" strokeWidth="2" strokeLinecap="square" />
      <path d="M8 22h16" className="stroke-teal" strokeWidth="2" strokeLinecap="square" />
      <path d="M10 10v12M22 10v12" className="stroke-white/80" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span
        className={clsx(
          "font-mono text-[13px] font-medium tracking-[0.32em]",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        TIREK
      </span>
    </span>
  );
}
