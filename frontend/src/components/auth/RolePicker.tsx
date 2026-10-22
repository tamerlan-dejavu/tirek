"use client";

import clsx from "clsx";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  ClipboardCheck,
  Headset,
  House,
  LoaderCircle,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import type { DemoAccount } from "@/lib/api/types";

const ICON: Record<string, LucideIcon> = {
  resident: House,
  field: ClipboardCheck,
  engineer: ShieldCheck,
  pto: CalendarRange,
  dispatcher: Headset,
  osi: Building2,
  admin: UserCog,
};

const GROUPS: { key: DemoAccount["group"]; title: string; note: string }[] = [
  { key: "residents", title: "Жители", note: "Сообщить о проблеме и следить за решением" },
  { key: "provider", title: "Инженерная организация (ЕИТЦ)", note: "Обследования, оценка, планирование и исполнение" },
  { key: "customer", title: "Управление домом", note: "Решения и контроль от имени собственников" },
];

/**
 * Demo stand entry: «Кто вы?». One click signs in as the demo account of that role.
 * Shown only when the backend reports DEMO_MODE; the server allows only fixed demo accounts.
 */
export function RolePicker({ accounts, onSignedIn }: { accounts: DemoAccount[]; onSignedIn: (home: string) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function choose(a: DemoAccount) {
    setPending(a.key);
    setError(null);
    try {
      const me = await api<{ home: string }>("auth/demo/login/", { method: "POST", body: { key: a.key } });
      onSignedIn(me.home);
    } catch (err) {
      setError(err);
      setPending(null);
    }
  }

  return (
    <div>
      {error ? (
        <div className="mb-4">
          <ErrorState error={error} />
        </div>
      ) : null}
      <div className="space-y-8">
        {GROUPS.map((g) => {
          const list = accounts.filter((a) => a.group === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key} aria-labelledby={`grp-${g.key}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`grp-${g.key}`} className="text-[15px] font-semibold">
                  {g.title}
                </h2>
                <span className="hidden text-xs text-muted sm:block">{g.note}</span>
              </div>
              <ul className={clsx("grid gap-3", list.length > 1 && "sm:grid-cols-2 xl:grid-cols-3")}>
                {list.map((a) => {
                  const Icon = ICON[a.key] ?? UserCog;
                  const busy = pending === a.key;
                  return (
                    <li key={a.key}>
                      <button
                        onClick={() => choose(a)}
                        disabled={!!pending}
                        className={clsx(
                          "group flex h-full w-full flex-col rounded-lg border bg-surface p-5 text-left transition-colors duration-[var(--duration-base)]",
                          busy ? "border-accent" : "border-line hover:border-line-strong hover:bg-mist/40",
                          pending && !busy && "opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid size-10 place-items-center rounded-md border border-line bg-base text-accent">
                            <Icon className="size-5" strokeWidth={1.7} aria-hidden />
                          </span>
                          {busy ? (
                            <LoaderCircle className="size-4 animate-spin text-accent" aria-label="Вход…" />
                          ) : (
                            <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                          )}
                        </div>
                        <div className="mt-4 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{a.title}</div>
                        <div className="mt-0.5 text-[13px] text-muted">{a.summary}</div>
                        <ul className="mt-4 flex flex-wrap gap-1.5">
                          {a.abilities.map((x) => (
                            <li key={x} className="rounded-sm border border-line px-1.5 py-0.5 text-[11.5px] text-muted">
                              {x}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto pt-4 font-mono text-[11px] text-faint">{a.person}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
