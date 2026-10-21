"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useMe } from "@/lib/api/hooks";
import { can } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  visible?: boolean;
}

export function Sidebar({ items, title }: { items: NavItem[]; title: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Основная навигация" className="flex flex-col gap-0.5 p-3">
      <div className="mb-4 px-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
        Tirek · {title}
      </div>
      {items
        .filter((i) => i.visible !== false)
        .map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "rounded-sm px-2 py-1.5 text-sm",
                active ? "bg-accent/10 font-medium text-accent" : "text-ink hover:bg-canvas",
              )}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

/** Provider staff navigation (ТЗ 12). */
export function ProviderSidebar() {
  const { data: me } = useMe();
  return (
    <Sidebar
      title="Поставщик"
      items={[
        { href: "/dashboard", label: "Главная" },
        { href: "/buildings", label: "Дома" },
        { href: "/inspections", label: "Обследования" },
        { href: "/defects", label: "Дефекты" },
        { href: "/work-orders", label: "План работ" },
        { href: "/reports", label: "Отчёты" },
        { href: "/admin/organizations", label: "Организации и пользователи", visible: can.manageOrganizations(me) },
        { href: "/settings", label: "Настройки" },
      ]}
    />
  );
}
