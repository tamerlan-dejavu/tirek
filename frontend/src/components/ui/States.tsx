import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/client";

/** Loading / empty / error states, designed for every screen (ТЗ 11.6). */

export function Loading({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div role="status" className="py-10 text-center text-sm text-ink-muted">
      {label}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? "Недостаточно прав для просмотра."
        : error.status === 404
          ? "Не найдено или нет доступа."
          : error.message
      : "Не удалось загрузить данные. Проверьте соединение.";
  return (
    <div role="alert" className="rounded-sm border border-risk-r1/40 bg-risk-r1/5 px-4 py-3 text-sm text-risk-r1">
      {message}
    </div>
  );
}

export function QueryState<T>({
  query,
  empty,
  children,
}: {
  query: { isLoading: boolean; error: unknown; data: T | undefined };
  empty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  if (query.data === undefined) return null;
  if (empty?.(query.data)) return <Empty title="Пока ничего нет" />;
  return <>{children(query.data)}</>;
}
