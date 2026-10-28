"use client";

import clsx from "clsx";
import {
  Bell,
  BookOpen,
  Building2,
  ChartColumn,
  ClipboardCheck,
  FileText,
  FolderOpen,
  House,
  Inbox,
  LayoutGrid,
  MessageSquarePlus,
  ScrollText,
  Settings2,
  TriangleAlert,
  type LucideIcon,
  Users,
  Vote,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/Logo";
import { useFeatures, useMe } from "@/lib/api/hooks";
import type { Me } from "@/lib/api/types";
import { can } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  code: string;
  visible?: (me?: Me) => boolean;
  /** Shown only when this optional feature is enabled on the server */
  feature?: "polls" | "risk_scoring";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Provider staff navigation. Role-aware: items the role does not use are not shown. */
export const PROVIDER_NAV: NavGroup[] = [
  {
    title: "Работа",
    items: [
      { href: "/dashboard", label: "Обзор", icon: LayoutGrid, code: "01" },
      { href: "/requests", label: "Заявки", icon: Inbox, code: "02" },
      { href: "/buildings", label: "Здания", icon: Building2, code: "03" },
      { href: "/inspections", label: "Обследования", icon: ClipboardCheck, code: "04", visible: can.inspect },
      { href: "/defects", label: "Дефекты", icon: TriangleAlert, code: "05" },
      { href: "/work-orders", label: "Обслуживание", icon: Wrench, code: "06" },
    ],
  },
  {
    title: "Сведения",
    items: [
      { href: "/analytics", label: "Аналитика", icon: ChartColumn, code: "07", visible: can.seeAnalytics },
      { href: "/reports", label: "Отчёты", icon: FileText, code: "08" },
      { href: "/documents", label: "Документы", icon: FolderOpen, code: "09" },
    ],
  },
  {
    title: "Управление",
    items: [
      { href: "/admin/organizations", label: "Организации и роли", icon: Users, code: "10", visible: can.manageOrganizations },
      { href: "/admin/reference", label: "Справочники", icon: BookOpen, code: "11", visible: can.manageOrganizations },
      { href: "/admin/audit", label: "Журнал аудита", icon: ScrollText, code: "12", visible: can.manageOrganizations },
      { href: "/settings", label: "Настройки", icon: Settings2, code: "13" },
    ],
  },
];

export const OSI_NAV: NavGroup[] = [
  {
    title: "Кабинет заказчика",
    items: [
      { href: "/osi", label: "Мои здания", icon: Building2, code: "01" },
      { href: "/requests", label: "Заявки жителей", icon: Inbox, code: "02" },
      { href: "/settings", label: "Настройки", icon: Settings2, code: "03" },
    ],
  },
];

export const RESIDENT_NAV: NavGroup[] = [
  {
    title: "Мой дом",
    items: [
      { href: "/resident", label: "Главная", icon: House, code: "01" },
      { href: "/resident/new", label: "Сообщить о проблеме", icon: MessageSquarePlus, code: "02" },
      { href: "/resident/polls", label: "Опросы", icon: Vote, code: "03", feature: "polls" },
      { href: "/settings", label: "Уведомления и профиль", icon: Bell, code: "04" },
    ],
  },
];

export const ROLE_LABEL: Record<string, string> = {
  provider_admin: "Администратор",
  field_specialist: "Полевой специалист",
  reviewing_engineer: "Инженер",
  production_planner: "ПТО",
  dispatcher: "Диспетчер",
  osi_representative: "Представитель заказчика",
  resident: "Житель",
};

export function Sidebar({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const features = useFeatures();
  const membership = me?.memberships[0];

  return (
    <div className="flex h-full flex-col border-r border-line bg-base text-ink">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link href="/" aria-label="Tirek — на главную" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav aria-label="Основная навигация" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const items = group.items.filter((i) => (!i.visible || i.visible(me)) && (!i.feature || features?.[i.feature]));
          if (!items.length) return null;
          return (
            <div key={group.title} className="mb-5">
              <div className="mb-1.5 px-2 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
                {group.title}
              </div>
              <ul className="space-y-px">
                {items.map((item) => {
                  const active =
                    pathname === item.href || (item.href !== "/osi" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={clsx(
                          "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-[13.5px] transition-colors duration-[var(--duration-base)]",
                          active ? "bg-mist text-ink" : "text-muted hover:bg-mist/60 hover:text-ink",
                        )}
                      >
                        {active && <span aria-hidden className="absolute top-2 bottom-2 -left-3 w-[2px] bg-accent" />}
                        <Icon aria-hidden className={clsx("size-4", active ? "text-accent" : "text-faint group-hover:text-muted")} strokeWidth={1.7} />
                        <span className="flex-1">{item.label}</span>
                        <span className="font-mono text-[10px] text-faint/70">{item.code}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {membership && (
        <div className="border-t border-line px-5 py-4">
          <div className="truncate text-[13px] text-ink">{membership.organization_name}</div>
          <div className="mt-0.5 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
            {ROLE_LABEL[membership.role] ?? membership.role}
          </div>
        </div>
      )}
    </div>
  );
}
