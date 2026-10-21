"use client";

import { Bell, ChevronRight, LogOut, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: "Обзор",
  buildings: "Дома",
  inspections: "Обследования",
  defects: "Дефекты",
  "work-orders": "Обслуживание",
  analytics: "Аналитика",
  reports: "Отчёты",
  documents: "Документы",
  admin: "Управление",
  organizations: "Организации и роли",
  settings: "Настройки",
  osi: "Кабинет ОСИ",
  passport: "Паспорт",
  elements: "Элементы и системы",
  history: "История",
  fill: "Чек-лист",
  new: "Новая запись",
};

// Grouping segments without their own page
const NO_PAGE = new Set(["/osi/buildings", "/osi/defects", "/admin"]);

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
  const [q, setQ] = useState("");

  async function logout() {
    await api("auth/logout/", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/defects?q=${encodeURIComponent(q.trim())}`);
  }

  const initials = (me?.full_name || me?.email || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur md:px-6">
      <button onClick={onMenu} className="-ml-1 grid size-9 place-items-center rounded-md text-ink hover:bg-mist lg:hidden" aria-label="Открыть меню">
        <Menu className="size-5" />
      </button>
      <Breadcrumbs />

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

      <Link
        href="/settings#notifications"
        className="relative ml-auto grid size-9 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink sm:ml-0"
        aria-label={unread?.count ? `Уведомления: ${unread.count} непрочитанных` : "Уведомления"}
      >
        <Bell className="size-[18px]" strokeWidth={1.8} />
        {!!unread?.count && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-critical px-1 font-mono text-[9px] leading-4 text-white">
            {unread.count}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-2.5 border-l border-line pl-3">
        <span aria-hidden className="grid size-8 place-items-center rounded-full border border-line bg-mist font-mono text-[11px] text-ink">
          {initials}
        </span>
        <div className="hidden leading-tight xl:block">
          <div className="text-[13px] text-ink">{me?.full_name || me?.email}</div>
          {me?.position && <div className="text-[11px] text-muted">{me.position}</div>}
        </div>
        <button onClick={logout} className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink" aria-label="Выйти">
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
