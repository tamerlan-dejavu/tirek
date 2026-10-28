"use client";

import Link from "next/link";
import { use, useState, type FormEvent } from "react";

import { EvidenceGallery } from "@/components/defects/EvidenceGallery";
import { MediaUpload } from "@/components/files/MediaUpload";
import { LifecycleStepper } from "@/components/defects/LifecycleStepper";
import { RiskScoring, scoreOf, type Factors } from "@/components/defects/RiskScoring";
import { WorkOrderTable } from "@/components/lists/WorkOrderList";
import { CreateWorkOrder } from "@/components/workorders/CreateWorkOrder";
import { ApprovalTag, RiskBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { ErrorState, QueryState, Skeleton } from "@/components/ui/States";
import { BuildingElevation } from "@/components/viz/BuildingElevation";
import type { Paginated } from "@/lib/api/client";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { Building, Defect, RiskCategory, WorkOrder } from "@/lib/api/types";
import { can, roles } from "@/lib/permissions";
import {
  DEFECT_PRIORITY,
  DEFECT_STATUS,
  formatDate,
  formatDateTime,
  RISK,
  RISK_ORDER,
} from "@/lib/status";

interface Observation {
  id: string;
  observed_on: string;
  description: string;
  trend: "worse" | "same" | "better";
  created_at: string;
}
interface Event {
  id: string;
  from_status: Defect["status"] | "";
  to_status: Defect["status"];
  actor_name: string;
  comment: string;
  created_at: string;
}
interface Risk {
  id: string;
  category: RiskCategory;
  justification: string;
  hazard_description: string;
  recommended_actions: string;
  revision_reason: string;
  engineer_name: string;
  version: number;
  probability: number | null;
  consequences: number | null;
  condition: number | null;
  service_life: number | null;
  score: number | null;
  suggested_category: RiskCategory | "";
  is_override: boolean;
  created_at: string;
}

const TREND = { worse: "ухудшение", same: "без изменений", better: "улучшение" } as const;
const textarea =
  "min-h-20 w-full rounded-md border border-line bg-surface p-2.5 text-sm focus:border-accent focus:outline-none";

export default function DefectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const defect = useApi<Defect>(`defects/${id}/`);
  const d = defect.data;
  const building = useApi<Building>(d ? `buildings/${d.building}/` : null);
  const observations = useApi<Observation[]>(`defects/${id}/observations/`);
  const events = useApi<Event[]>(`defects/${id}/events/`);
  const risks = useApi<Paginated<Risk>>(`risk-assessments/?defect=${id}`);
  const work = useApi<Paginated<WorkOrder>>(`work-orders/?defect=${id}`);

  const keys = [
    [`defects/${id}/`],
    [`defects/${id}/events/`],
    [`risk-assessments/?defect=${id}`],
    [`defects/${id}/observations/`],
  ];
  const assess = useAction<Record<string, string | number>>("risk-assessments/", keys);
  const clarify = useAction<{ comment: string }>(`defects/${id}/request-clarification/`, keys);
  const resubmit = useAction<{ comment: string }>(`defects/${id}/resubmit/`, keys);
  const reject = useAction<{ reason: string }>(`defects/${id}/reject/`, keys);
  const close = useAction<{ basis: string }>(`defects/${id}/close/`, keys);
  const setPriority = useAction<{ priority: string }>(`defects/${id}/`, keys, "PATCH");
  const observe = useAction<{ description: string; trend: string }>(
    `defects/${id}/observations/`,
    keys,
  );
  const actionError =
    resubmit.error ??
    setPriority.error ??
    assess.error ??
    clarify.error ??
    reject.error ??
    close.error ??
    observe.error;

  const [riskForm, setRiskForm] = useState({
    category: "R3",
    hazard_description: "",
    justification: "",
    recommended_actions: "",
    revision_reason: "",
  });
  const [factors, setFactors] = useState<Factors>({});
  const [note, setNote] = useState("");
  const [revising, setRevising] = useState(false);
  const [obs, setObs] = useState({ description: "", trend: "same" });
  const isReviewer = can.review(me);
  const isField = roles(me).has("field_specialist") || isReviewer;

  if (defect.isLoading) return <Skeleton className="h-40 w-full" />;
  if (defect.error || !d) return <ErrorState error={defect.error} />;
  const current = risks.data?.results[0];

  function submitRisk(e: FormEvent) {
    e.preventDefault();
    const { revision_reason, ...rest } = riskForm;
    const scored = scoreOf(factors) ? (factors as Record<string, number>) : {};
    assess.mutate({ defect: id, ...rest, ...scored, ...(current ? { revision_reason } : {}) });
  }

  return (
    <>
      {/* Header: identity, severity and status as separate dimensions */}
      <header className="mb-6 rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <div className="label-tech mb-1.5">
              04 · Дефект <span className="text-ink">{d.number}</span>
              {d.inspection_number && (
                <>
                  {" "}
                  · источник{" "}
                  <Link
                    href={`/inspections/${d.inspection}`}
                    className="text-accent-strong hover:underline"
                  >
                    {d.inspection_number}
                  </Link>
                </>
              )}
            </div>
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em] md:text-[26px]">
              {d.defect_type}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              <Link href={`/buildings/${d.building}`} className="text-ink hover:text-accent-strong">
                {d.building_address}
              </Link>{" "}
              · {d.element_path.join(" → ")}
              {d.location && ` · ${d.location}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="label-tech">Риск</span>
              {d.approved_risk ? (
                <RiskBadge category={d.approved_risk} />
              ) : (
                <RiskBadge category={d.preliminary_severity} preliminary />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="label-tech">Статус</span>
              <StatusBadge {...DEFECT_STATUS[d.status]} />
            </div>
          </div>
        </div>
        <div className="border-t border-line px-5 py-4">
          <LifecycleStepper status={d.status} />
        </div>
      </header>

      {actionError ? (
        <div className="mb-4">
          <ErrorState error={actionError} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card index="A" title="Описание">
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink">
              {d.description}
            </p>
            {d.recommendations && (
              <div className="mt-4 rounded-md border-l-2 border-accent bg-accent-soft/50 px-3 py-2.5">
                <div className="label-tech mb-1 !text-accent-strong">Рекомендовано инженером</div>
                <p className="text-sm">{d.recommendations}</p>
              </div>
            )}
          </Card>

          <Card index="B" title="Фотофиксация">
            <EvidenceGallery targetType="defect" targetId={id} />
            {isField && d.status !== "closed" && d.status !== "rejected" && (
              <MediaUpload building={d.building} targetType="defect" targetId={id} />
            )}
          </Card>

          <Card index="C" title="Расположение на схеме">
            {building.data ? (
              <BuildingElevation
                floors={building.data.floors}
                entrances={building.data.entrances}
                defects={[d]}
                animate={false}
                hrefFor={() => "#"}
              />
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </Card>

          <Card index="D" title="Мероприятия по устранению" flush>
            {isReviewer && d.status === "confirmed" && <CreateWorkOrder defect={d} />}
            <QueryState
              query={work}
              empty={(w) => w.results.length === 0}
              emptyTitle="Мероприятия не созданы"
              emptyText="Создаются инженером из подтверждённого дефекта."
            >
              {(w) => <WorkOrderTable rows={w.results} />}
            </QueryState>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Сведения">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="Идентификатор" mono>
                {d.number}
              </Field>
              <Field label="Категория">
                {d.category_name ?? <span className="text-warning-ink">не указана</span>}
              </Field>
              <Field label="Обнаружен" mono>
                {formatDate(d.detected_on)}
              </Field>
              <Field label="Специалист">{d.author_name ?? "—"}</Field>
              <Field label="Степень опасности">
                {d.approved_risk ? (
                  <RiskBadge category={d.approved_risk} size="sm" />
                ) : (
                  <RiskBadge category={d.preliminary_severity} preliminary size="sm" />
                )}
              </Field>
              <Field label="Приоритет">
                {isReviewer ? (
                  <select
                    value={d.priority}
                    onChange={(e) => setPriority.mutate({ priority: e.target.value })}
                    aria-label="Приоритет устранения"
                    className="h-8 rounded-md border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none"
                  >
                    <option value="" disabled>
                      — не задан —
                    </option>
                    {Object.entries(DEFECT_PRIORITY).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                ) : d.priority ? (
                  <StatusBadge {...DEFECT_PRIORITY[d.priority]} />
                ) : (
                  <ApprovalTag approved={false}>после оценки</ApprovalTag>
                )}
              </Field>
              <Field label="Обновлено" mono>
                {formatDateTime(d.updated_at)}
              </Field>
              {d.closure_basis && <Field label="Основание закрытия">{d.closure_basis}</Field>}
            </dl>
          </Card>

          <Card title="Оценка риска">
            <QueryState
              query={risks}
              empty={(r) => r.results.length === 0}
              emptyTitle="Риск не подтверждён"
              emptyText="Категорию R1–R4 присваивает проверяющий инженер с обоснованием."
            >
              {(r) => (
                <ol className="space-y-4">
                  {r.results.map((ra, i) => (
                    <li key={ra.id} className={i > 0 ? "opacity-70" : undefined}>
                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge category={ra.category} size={i ? "sm" : "md"} />
                        <span className="font-mono text-[11px] text-muted">
                          v{ra.version} · {formatDate(ra.created_at)}
                        </span>
                        {i === 0 && <ApprovalTag approved>Действует</ApprovalTag>}
                      </div>
                      {ra.score !== null && (
                        <p className="mt-2 font-mono text-[11px] text-muted">
                          {ra.probability}×{ra.consequences}×{ra.condition}×{ra.service_life} ={" "}
                          {ra.score} · расчёт {ra.suggested_category}
                          {ra.is_override && (
                            <span className="text-warning-ink">
                              {" "}
                              · решение инженера отличается от расчёта
                            </span>
                          )}
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        <span className="text-muted">Опасность: </span>
                        {ra.hazard_description}
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="text-muted">Обоснование: </span>
                        {ra.justification}
                      </p>
                      {ra.revision_reason && (
                        <p className="mt-1 text-sm">
                          <span className="text-muted">Причина пересмотра: </span>
                          {ra.revision_reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted">Инженер: {ra.engineer_name}</p>
                    </li>
                  ))}
                </ol>
              )}
            </QueryState>

            {isReviewer &&
              current &&
              !revising &&
              d.status !== "closed" &&
              d.status !== "rejected" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setRevising(true)}
                >
                  Пересмотреть оценку
                </Button>
              )}
            {isReviewer &&
              (d.status === "in_review" || (current && revising)) &&
              d.status !== "closed" &&
              d.status !== "rejected" && (
                <form onSubmit={submitRisk} className="mt-4 space-y-2.5 border-t border-line pt-4">
                  <div className="label-tech">
                    {current ? "Пересмотреть оценку" : "Подтвердить дефект и риск"}
                  </div>
                  <RiskScoring
                    value={factors}
                    onChange={setFactors}
                    yearBuilt={building.data?.year_built}
                    chosen={riskForm.category as RiskCategory}
                    onSuggest={(c) => setRiskForm((f) => ({ ...f, category: c }))}
                  />
                  <div className="text-xs text-muted">Категория риска (решение инженера)</div>
                  <div
                    role="radiogroup"
                    aria-label="Категория риска"
                    className="grid grid-cols-4 gap-1.5"
                  >
                    {RISK_ORDER.map((r) => (
                      <button
                        type="button"
                        key={r}
                        role="radio"
                        aria-checked={riskForm.category === r}
                        onClick={() => setRiskForm({ ...riskForm, category: r })}
                        className={
                          riskForm.category === r
                            ? "rounded-md border border-accent-strong bg-accent-soft py-1.5 font-mono text-sm text-accent-strong"
                            : "rounded-md border border-line py-1.5 font-mono text-sm hover:border-line-strong"
                        }
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    {RISK[riskForm.category as RiskCategory].action}
                  </p>
                  {(["hazard_description", "justification", "recommended_actions"] as const).map(
                    (k) => (
                      <textarea
                        key={k}
                        required
                        value={riskForm[k]}
                        onChange={(e) => setRiskForm({ ...riskForm, [k]: e.target.value })}
                        placeholder={
                          {
                            hazard_description: "Описание опасности",
                            justification: "Обоснование категории",
                            recommended_actions: "Рекомендуемые действия",
                          }[k]
                        }
                        aria-label={
                          {
                            hazard_description: "Описание опасности",
                            justification: "Обоснование категории",
                            recommended_actions: "Рекомендуемые действия",
                          }[k]
                        }
                        className={textarea}
                      />
                    ),
                  )}
                  {current && (
                    <input
                      required
                      value={riskForm.revision_reason}
                      onChange={(e) =>
                        setRiskForm({ ...riskForm, revision_reason: e.target.value })
                      }
                      placeholder="Причина пересмотра"
                      aria-label="Причина пересмотра"
                      className="h-9 w-full rounded-md border border-line px-2.5 text-sm"
                    />
                  )}
                  <Button type="submit" className="w-full" disabled={assess.isPending}>
                    {current ? "Сохранить новую версию оценки" : "Подтвердить"}
                  </Button>
                </form>
              )}
          </Card>

          {isReviewer && ["in_review", "fix_review", "confirmed"].includes(d.status) && (
            <Card title="Решение инженера">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий, причина или основание"
                aria-label="Комментарий инженера"
                className={textarea}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {d.status === "in_review" && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!note.trim()}
                      onClick={() => clarify.mutate({ comment: note })}
                    >
                      Требует уточнения
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={!note.trim()}
                      onClick={() => reject.mutate({ reason: note })}
                    >
                      Отклонить как ошибочный
                    </Button>
                  </>
                )}
                {(d.status === "fix_review" || d.status === "confirmed") && (
                  <Button
                    size="sm"
                    disabled={!note.trim()}
                    onClick={() => close.mutate({ basis: note })}
                  >
                    Закрыть с основанием
                  </Button>
                )}
              </div>
            </Card>
          )}

          {isField &&
            (d.status === "needs_clarification" || (d.status === "detected" && !d.inspection)) && (
              <Card
                title={
                  d.status === "needs_clarification" ? "Ответ на уточнение" : "Отправка инженеру"
                }
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    d.status === "needs_clarification"
                      ? "Что уточнено: замеры, место, новые фото"
                      : "Комментарий для инженера"
                  }
                  aria-label="Комментарий для инженера"
                  className={textarea}
                />
                <Button
                  className="mt-2 w-full"
                  disabled={!note.trim() || resubmit.isPending}
                  onClick={() =>
                    resubmit.mutate({ comment: note }, { onSuccess: () => setNote("") })
                  }
                >
                  Отправить на проверку
                </Button>
              </Card>
            )}

          <Card title="История">
            <QueryState query={events}>
              {(evs) => (
                <ol className="relative space-y-4 border-l border-line pl-4">
                  {[
                    ...evs.map((e) => ({ at: e.created_at, kind: "event" as const, e })),
                    ...(observations.data ?? []).map((o) => ({
                      at: o.created_at,
                      kind: "obs" as const,
                      o,
                    })),
                  ]
                    .sort((a, b) => a.at.localeCompare(b.at))
                    .map((item) => (
                      <li key={item.kind === "event" ? item.e.id : item.o.id} className="relative">
                        <span
                          aria-hidden
                          className={
                            item.kind === "obs"
                              ? "absolute top-1 -left-[21px] size-2.5 rotate-45 border-2 border-surface bg-warning"
                              : "absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-accent"
                          }
                        />
                        {item.kind === "event" ? (
                          <>
                            <div className="text-sm text-ink">
                              {DEFECT_STATUS[item.e.to_status].label}
                            </div>
                            {item.e.comment && (
                              <div className="text-[13px] text-muted">{item.e.comment}</div>
                            )}
                            <div className="mt-0.5 font-mono text-[11px] text-faint">
                              {formatDateTime(item.e.created_at)} · {item.e.actor_name}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-ink">
                              Повторное наблюдение ·{" "}
                              <span className="text-warning-ink">{TREND[item.o.trend]}</span>
                            </div>
                            <div className="text-[13px] text-muted">{item.o.description}</div>
                            <div className="mt-0.5 font-mono text-[11px] text-faint">
                              {formatDate(item.o.observed_on)}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                </ol>
              )}
            </QueryState>
            {isField && d.status !== "closed" && d.status !== "rejected" && (
              <form
                className="mt-4 space-y-2 border-t border-line pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  observe.mutate(obs, {
                    onSuccess: () => setObs({ description: "", trend: "same" }),
                  });
                }}
              >
                <div className="label-tech">Повторное наблюдение</div>
                <textarea
                  required
                  value={obs.description}
                  onChange={(e) => setObs({ ...obs, description: e.target.value })}
                  placeholder="Что изменилось"
                  aria-label="Описание наблюдения"
                  className={textarea}
                />
                <div className="flex gap-2">
                  <select
                    value={obs.trend}
                    onChange={(e) => setObs({ ...obs, trend: e.target.value })}
                    aria-label="Изменение состояния"
                    className="h-9 flex-1 rounded-md border border-line bg-surface px-2 text-sm"
                  >
                    <option value="worse">Ухудшение</option>
                    <option value="same">Без изменений</option>
                    <option value="better">Улучшение</option>
                  </select>
                  <Button type="submit" variant="secondary">
                    Добавить
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
