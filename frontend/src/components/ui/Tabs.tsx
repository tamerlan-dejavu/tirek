"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

/** Segmented control for switching views of the same data (Таймлайн / Таблица / Календарь). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-mist/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] transition-colors",
            value === o.value ? "bg-surface font-medium text-ink shadow-[var(--shadow-panel)]" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Filter chip used in filter bars. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors",
        active ? "border-accent-strong bg-accent-soft text-accent-strong" : "border-line bg-surface text-ink hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}
