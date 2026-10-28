"use client";

import clsx from "clsx";
import { Bell, ChevronRight, LogOut, Menu, Repeat2, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";
import { isCustomerOnly } from "@/lib/permissions";

import { ROLE_LABEL } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: "Обзор",
  buildings: "Здания",
  inspections: "Обследования",
  defects: "Дефекты",
  "work-orders": "Обслуживание",
  analytics: "Аналитика",
  reports: "Отчёты",
  documents: "Документы",
  admin: "Управление",
  organizations: "Организации и роли",
  settings: "Настройки",
  osi: "Кабинет заказчика",
  passport: "Паспорт",
  elements: "Элементы и системы",
  history: "История",
  fill: "Чек-лист",
  new: "Новая запись",
  requests: "Заявки",
  resident: "Мой дом",
  polls: "Опросы",
  audit: "Журнал аудита",
  reference: "Справочники",
};

// Grouping segments without their own page
const NO_PAGE = new Set(["/osi/buildings", "/osi/defects", "/admin", "/resident/requests"]);

function Breadcrumbs() {
  const all = usePathname().split("/").filter(Boolean);
  const parts = all.filter((_, i) => !NO_PAGE.has(`/${all.slice(0, i + 1).join("/")}`));
  return (
    <nav aria-label="Путь" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
      {parts.map((p, i) => {
        const href = `/${all.slice(0, all.indexOf(p) + 1).join("/")}`;
        const label = SEGMENT_LABEL[p] ?? (p.length > 12 ? "Запись" : p);
        const last = i === parts.length - 1;
        return (
          <span key={href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-faint" />}
            {last ? (
              <span aria-current="page" className="truncate text-ink">{label}</span>
            ) : (
              <Link href={href} className="truncate text-muted hover:text-ink">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: unread } = useApi<{ count: number }>("notifications/unread_count/");
  const { data: demo } = useApi<{ enabled: boolean }>("auth/demo/", ["demo"]);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false); // phones: search opens as a second row
  const showSearch = !!me && !isCustomerOnly(me);

  async function logout() {
    await api("auth/logout/", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/defects?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false);
  }

  const initials = (me?.full_name || me?.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
    <header className="flex h-14 items-center gap-2 px-4 sm:gap-3 md:px-6">
      <button onClick={onMenu} className="-ml-1 grid size-9 place-items-center rounded-md text-ink hover:bg-mist lg:hidden" aria-label="Открыть меню">
        <Menu className="size-5" />
      </button>
      <Breadcrumbs />

      {showSearch ? (
      <form onSubmit={search} role="search" className="ml-auto hidden w-72 items-center gap-2 rounded-md border border-line bg-surface px-2.5 transition-colors focus-within:border-accent sm:flex">
        <Search aria-hidden className="size-4 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Дефект, адрес, номер…"
          aria-label="Поиск по реестру дефектов"
          className="h-8 w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
        <kbd className="hidden font-mono text-[10px] text-faint xl:block">↵</kbd>
      </form>
      ) : (
        <span className="ml-auto hidden sm:block" />
      )}
      {showSearch && (
        <button
          onClick={() => setSearchOpen((v) => !v)}
          aria-expanded={searchOpen}
          aria-label="Поиск по реестру дефектов"
          className="ml-auto grid size-9 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink sm:hidden"
        >
          <Search className="size-[18px]" strokeWidth={1.8} />
        </button>
      )}

      {demo?.enabled && (
        <button
          onClick={logout}
          className="inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-line text-[13px] whitespace-nowrap text-muted transition-colors hover:border-line-strong hover:text-ink lg:h-8 lg:w-auto lg:px-2.5"
          title="Выйти и выбрать другую роль"
          aria-label="Сменить роль"
        >
          <Repeat2 className="size-4 lg:size-3.5" aria-hidden />
          <span className="hidden lg:inline">Сменить роль</span>
        </button>
      )}

      <ThemeToggle />

      <Link
        href="/settings#notifications"
        className={clsx("relative grid size-9 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink sm:ml-0", !showSearch && "ml-auto")}
        aria-label={unread?.count ? `Уведомления: ${unread.count} непрочитанных` : "Уведомления"}
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {!!unread?.count && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-critical px-1 font-mono text-[9px] leading-4 text-white">
            {unread.count}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-2 border-l border-line pl-2 sm:gap-2.5 sm:pl-3">
        <span aria-hidden className="grid size-8 place-items-center rounded-full border border-line bg-mist font-mono text-[11px] text-ink">
          {initials}
        </span>
        <div className="hidden leading-tight xl:block">
          <div className="text-[13px] text-ink">{me?.full_name || me?.email}</div>
          <div className="text-[11px] text-muted">
            {[me?.memberships[0] ? ROLE_LABEL[me.memberships[0].role] : "", me?.position]
              .filter((v, i, arr) => v && arr.indexOf(v) === i)
              .join(" · ")}
          </div>
        </div>
        <button onClick={logout} className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink" aria-label="Выйти">
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
    {searchOpen && (
      <form onSubmit={search} role="search" className="flex items-center gap-2 border-t border-line px-4 py-2 sm:hidden">
        <Search aria-hidden className="size-4 shrink-0 text-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Дефект, адрес, номер…"
          aria-label="Поиск по реестру дефектов"
          className="h-9 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
      </form>
    )}
    </div>
  );
}
