import clsx from "clsx";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/client";

/** Loading / empty / error states — designed for every screen (ТЗ 11.6). */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-md bg-mist", className)} />;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Загрузка" className="space-y-2.5 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={clsx("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid-blueprint-light flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-md border border-dashed border-line-strong bg-surface text-faint">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <path d="M4 20V9l8-5 8 5v11M4 20h16M9 20v-6h6v6" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? "Недостаточно прав для этого действия."
        : error.status === 404
          ? "Запись не найдена или у вас нет к ней доступа."
          : typeof error.detail === "string"
            ? error.detail
            : JSON.stringify(error.detail)
      : "Не удалось загрузить данные. Проверьте соединение и повторите.";
  return (
    <div role="alert" className="rounded-md border border-critical/30 bg-critical-soft px-3 py-2.5 text-sm text-critical-ink">
      {message}
    </div>
  );
}

export function QueryState<T>({
  query,
  empty,
  emptyTitle = "Записей пока нет",
  emptyText,
  skeletonRows,
  children,
}: {
  query: { isLoading: boolean; error: unknown; data: T | undefined };
  empty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyText?: ReactNode;
  skeletonRows?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <Loading rows={skeletonRows} />;
  if (query.error)
    return (
      <div className="p-4">
        <ErrorState error={query.error} />
      </div>
    );
  if (query.data === undefined) return null;
  if (empty?.(query.data)) return <Empty title={emptyTitle}>{emptyText}</Empty>;
  return <>{children(query.data)}</>;
}
