"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useMe } from "@/lib/api/hooks";
import { isCustomerOnly, isResidentOnly } from "@/lib/permissions";

import { OSI_NAV, RESIDENT_NAV, Sidebar, type NavGroup } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Application frame: navigation rail (desktop) / drawer (tablet, phone) and the working canvas,
 * separated by a 1px line on the same graphite background.
 */
export function Shell({ nav: navProp, children }: { nav: NavGroup[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: me } = useMe();
  // Shared pages (e.g. settings) must not show provider navigation to a customer
  const nav = isResidentOnly(me) ? RESIDENT_NAV : isCustomerOnly(me) ? OSI_NAV : navProp;
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar groups={nav} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <button className="absolute inset-0 bg-black/60" aria-label="Закрыть меню" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw] animate-[fade-up_200ms_var(--ease-precise)] shadow-[var(--shadow-overlay)]">
            <Sidebar groups={nav} onNavigate={() => setOpen(false)} />
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
              aria-label="Закрыть меню"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
