"use client";

import { Upload, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { api } from "@/lib/api/client";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { Role, WorkOrder, WorkOrderStatus } from "@/lib/api/types";
import { roles } from "@/lib/permissions";
import {
  formatDate,
  formatDateTime,
  PERIODICITY,
  PRIORITY,
  WORK_KIND,
  WORK_ORDER_STATUS,
  WORK_TYPE,
} from "@/lib/status";

/* Mirrors backend workorders/models.py — UI hint only, the server enforces it. */
const NEXT: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  proposed: ["agreed", "rejected", "postponed", "cancelled"],
  postponed: ["agreed", "rejected", "cancelled"],
  agreed: ["scheduled", "postponed", "cancelled"],
  scheduled: ["in_progress", "postponed", "cancelled"],
  in_progress: ["done", "cancelled"],
  done: ["verified", "in_progress"],
  verified: ["closed"],
  closed: [],
  rejected: [],
  cancelled: [],
};
const ENGINEERING: Role[] = ["reviewing_engineer", "provider_admin"];
const WHO: Partial<Record<WorkOrderStatus, Role[]>> = {
  agreed: ["osi_representative"],
  rejected: ["osi_representative"],
  postponed: ["osi_representative", ...ENGINEERING, "production_planner"],
  scheduled: ["osi_representative", ...ENGINEERING, "production_planner"],
  in_progress: ["osi_representative", ...ENGINEERING, "production_planner"],
  done: ["osi_representative", ...ENGINEERING, "production_planner"],
  verified: ["reviewing_engineer"],
  closed: ENGINEERING,
  cancelled: ENGINEERING,
};
const NEEDS_REASON: WorkOrderStatus[] = ["rejected", "postponed", "cancelled"];
const ACTION_LABEL: Partial<Record<WorkOrderStatus, string>> = {
  scheduled: "Запланировать",
  in_progress: "Начать работы",
  done: "Отметить выполнение",
  verified: "Подтвердить результат",
  closed: "Закрыть",
  postponed: "Перенести",
  cancelled: "Отменить",
  agreed: "Согласовать",
  rejected: "Отклонить",
};
const PLANNERS: Role[] = ["production_planner", ...ENGINEERING];

interface Event {
  id: string;
  to_status: WorkOrderStatus;
  actor_name: string;
  reason: string;
  created_at: string;
}

const input =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

/** ПТО workspace for one work order: schedule, executor, resources, status, evidence. */
export function WorkOrderPanel({
  wo,
  onClose,
  onChanged,
}: {
  wo: WorkOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: me } = useMe();
  const my = roles(me);
  const canPlan = PLANNERS.some((r) => my.has(r));
  const events = useApi<Event[]>(`work-orders/${wo.id}/events/`);
  const [plan, setPlan] = useState({
    planned_date: wo.planned_date ?? "",
    responsible_name: wo.responsible_name ?? "",
    materials: wo.materials ?? "",
    labor_hours: wo.labor_hours ?? "",
  });
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const transition = useAction<{ status: string; reason: string }>(
    `work-orders/${wo.id}/transition/`,
    [[`work-orders/${wo.id}/events/`]],
  );

  const actions = NEXT[wo.status].filter((s) => (WHO[s] ?? []).some((r) => my.has(r)));

  async function savePlan() {
    setError(null);
    try {
      await api(`work-orders/${wo.id}/`, {
        method: "PATCH",
        body: {
          planned_date: plan.planned_date || null,
          responsible_name: plan.responsible_name,
          materials: plan.materials,
          labor_hours: plan.labor_hours || null,
        },
      });
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err);
    }
  }

  async function attach(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("building", wo.building);
    form.append("kind", file.type.startsWith("image/") ? "repair_photo" : "act");
    form.append("target_type", "work_order");
    form.append("target_id", wo.id);
    try {
      await api("files/upload/", { method: "POST", body: form });
      setSaved(true);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={wo.title}
    >
      <button className="absolute inset-0 bg-black/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-surface shadow-[var(--shadow-overlay)]">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="min-w-0">
            <div className="label-tech">
              {wo.number} · {wo.building_address}
            </div>
            <h2 className="mt-1 text-xl leading-snug font-semibold">{wo.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge {...WORK_ORDER_STATUS[wo.status]} />
              <span className="text-xs text-muted">
                приоритет: {PRIORITY[wo.priority].label.toLowerCase()}
              </span>
              {wo.risk_category && <RiskBadge category={wo.risk_category} size="sm" />}
              {wo.defect && (
                <Link
                  href={`/defects/${wo.defect}`}
                  className="font-mono text-xs text-accent hover:underline"
                >
                  {wo.defect_number}
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
            aria-label="Закрыть панель"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {error ? <ErrorState error={error} /> : null}

          <section>
            <h3 className="label-tech mb-3">Мероприятие</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Тип</dt>
                <dd>{WORK_KIND[wo.kind]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Вид работ</dt>
                <dd>{wo.work_type ? WORK_TYPE[wo.work_type] : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Элемент</dt>
                <dd>{wo.element_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Периодичность</dt>
                <dd>{PERIODICITY[wo.periodicity] ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Рекомендуемая дата</dt>
                <dd className="font-mono">{formatDate(wo.recommended_date)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Приоритет</dt>
                <dd>{PRIORITY[wo.priority].label}</dd>
              </div>
              {wo.basis && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted">Основание</dt>
                  <dd>{wo.basis}</dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <h3 className="label-tech mb-3">Производственный план</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Плановая дата</span>
                <input
                  type="date"
                  disabled={!canPlan}
                  value={plan.planned_date}
                  onChange={(e) => setPlan({ ...plan, planned_date: e.target.value })}
                  className={`${input} mt-1`}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Исполнитель / бригада</span>
                <input
                  disabled={!canPlan}
                  value={plan.responsible_name}
                  onChange={(e) => setPlan({ ...plan, responsible_name: e.target.value })}
                  className={`${input} mt-1`}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-muted">Материалы</span>
                <textarea
                  disabled={!canPlan}
                  value={plan.materials}
                  onChange={(e) => setPlan({ ...plan, materials: e.target.value })}
                  className="mt-1 min-h-20 w-full rounded-md border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Трудозатраты, чел·ч</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  disabled={!canPlan}
                  value={plan.labor_hours}
                  onChange={(e) => setPlan({ ...plan, labor_hours: e.target.value })}
                  className={`${input} mt-1 font-mono`}
                />
              </label>
            </div>
            {canPlan && (
              <div className="mt-3 flex items-center gap-3">
                <Button variant="secondary" onClick={savePlan}>
                  Сохранить план
                </Button>
                {saved && <span className="text-xs text-healthy-ink">Сохранено</span>}
              </div>
            )}
          </section>

          {actions.length > 0 && (
            <section>
              <h3 className="label-tech mb-3">Статус</h3>
              {actions.some((a) => NEEDS_REASON.includes(a)) && (
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Причина (для переноса, отклонения, отмены)"
                  aria-label="Причина"
                  className={`${input} mb-2`}
                />
              )}
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button
                    key={a}
                    size="sm"
                    variant={NEEDS_REASON.includes(a) ? "secondary" : "primary"}
                    disabled={transition.isPending || (NEEDS_REASON.includes(a) && !reason.trim())}
                    onClick={() =>
                      transition.mutate({ status: a, reason }, { onSuccess: onChanged })
                    }
                  >
                    {ACTION_LABEL[a] ?? WORK_ORDER_STATUS[a].label}
                  </Button>
                ))}
              </div>
              {transition.error ? (
                <div className="mt-2">
                  <ErrorState error={transition.error} />
                </div>
              ) : null}
              {actions.includes("done") && (
                <p className="mt-2 text-xs text-muted">
                  Для отметки выполнения приложите фото результата или акт.
                </p>
              )}
            </section>
          )}

          <section>
            <h3 className="label-tech mb-3">Подтверждения</h3>
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-sm text-muted transition-colors hover:border-accent hover:text-ink">
              <Upload className="size-4" aria-hidden /> Фото результата или акт (PDF)
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])}
              />
            </label>
          </section>

          <section>
            <h3 className="label-tech mb-3">История</h3>
            <ol className="relative space-y-3 border-l border-line pl-4">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-accent"
                  />
                  <div className="text-sm">{WORK_ORDER_STATUS[e.to_status].label}</div>
                  {e.reason && <div className="text-[13px] text-muted">{e.reason}</div>}
                  <div className="font-mono text-[11px] text-faint">
                    {formatDateTime(e.created_at)} · {e.actor_name}
                  </div>
                </li>
              ))}
              {events.data?.length === 0 && (
                <li className="text-sm text-muted">Переходов пока не было.</li>
              )}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
