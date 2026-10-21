"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Building card tabs (ТЗ 12)
const TABS = [
  { slug: "", label: "Обзор" },
  { slug: "passport", label: "Паспорт" },
  { slug: "elements", label: "Элементы и системы" },
  { slug: "inspections", label: "Обследования" },
  { slug: "defects", label: "Дефекты" },
  { slug: "work-orders", label: "План работ" },
  { slug: "documents", label: "Документы" },
  { slug: "history", label: "История" },
];

export function BuildingTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/buildings/${id}`;
  return (
    <nav aria-label="Разделы здания" className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map((t, i) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2 border-b-2 px-2.5 py-3 text-[13.5px] whitespace-nowrap transition-colors",
              active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            <span className={clsx("font-mono text-[10px]", active ? "text-accent-strong" : "text-faint")}>{String(i + 1).padStart(2, "0")}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
