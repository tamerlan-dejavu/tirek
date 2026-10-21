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
    <nav aria-label="Разделы здания" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((t) => {
        const href = t.slug ? `${base}/${t.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              active ? "border-accent font-medium text-accent" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
