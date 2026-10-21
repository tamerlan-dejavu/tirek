"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api/client";
import { useApi, useMe } from "@/lib/api/hooks";

export function Topbar() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: unread } = useApi<{ count: number }>("notifications/unread_count/");

  async function logout() {
    await api("auth/logout/", { method: "POST" });
    router.replace("/login");
  }

  return (
    <header className="flex h-12 items-center justify-end gap-4 border-b border-line bg-surface px-4 text-sm">
      <Link href="/settings#notifications" className="text-ink-muted hover:text-ink">
        Уведомления{unread?.count ? <span className="ml-1 font-mono text-risk-r1">{unread.count}</span> : null}
      </Link>
      <span className="text-ink-muted">{me?.full_name || me?.email}</span>
      <button onClick={logout} className="text-ink-muted hover:text-ink">
        Выйти
      </button>
    </header>
  );
}
