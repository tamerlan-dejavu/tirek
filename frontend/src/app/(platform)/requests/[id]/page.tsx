"use client";

import { Siren, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { EvidenceGallery } from "@/components/defects/EvidenceGallery";
import { MediaUpload } from "@/components/files/MediaUpload";
import { RequestHistory, RequestProgress } from "@/components/requests/RequestTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { BuildingElement, ServiceRequest } from "@/lib/api/types";
import { can, roles } from "@/lib/permissions";
import {
  formatDate,
  formatDateTime,
  OPEN_REQUEST,
  REQUEST_PRIORITY,
  REQUEST_STATUS,
} from "@/lib/status";

interface Assignee {
  id: string;
  name: string;
  position: string;
  open_tasks: number;
}

const input =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";
const textarea =
  "min-h-20 w-full rounded-md border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none";

/**
 * Dispatcher card of a request (spec §11). Actions follow the status and the role:
 * dispatcher accepts, prioritises, assigns and closes; the executor starts and completes with a
 * result photo; the engineer or dispatcher (not the executor) verifies the result.
 */
export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const query = useApi<ServiceRequest>(`service-requests/${id}/`);
  const r = query.data;
  const isDispatcher = can.dispatch(me);
  const isEngineer = roles(me).has("reviewing_engineer");
  const assignees = useApi<Assignee[]>(
    r && isDispatcher ? `service-requests/assignees/?building=${r.building}` : null,
  );
  const elements = useApi<BuildingElement[]>(
    r && (isDispatcher || isEngineer) && !r.defect
      ? `building-elements/?building=${r.building}`
      : null,
  );

  const keys = [[`service-requests/${id}/`], [`service-requests/${id}/events/`]];
  const act = (name: string) => `service-requests/${id}/${name}/`;
  const accept = useAction<{ text: string }>(act("accept"), keys);
  const prioritize = useAction<{ priority: string }>(act("prioritize"), keys);
  const assign = useAction<{ assignee: string; due_date: string | null; priority?: string }>(
    act("assign"),
    keys,
  );
  const start = useAction<{ text: string }>(act("start"), keys);
  const complete = useAction<{ text: string }>(act("complete"), keys);
  const verify = useAction<{ text: string }>(act("verify"), keys);
  const back = useAction<{ text: string }>(act("return"), keys);
  const close = useAction<{ text: string }>(act("close"), keys);
  const reject = useAction<{ text: string }>(act("reject"), keys);
  const emergency = useAction(act("confirm-emergency"), keys);
  const toDefect = useAction<{ element: string; defect_type: string }>(act("create-defect"), keys);
  const error =
    accept.error ??
    prioritize.error ??
    assign.error ??
    start.error ??
    complete.error ??
    verify.error ??
    back.error ??
    close.error ??
    reject.error ??
    emergency.error ??
    toDefect.error;

  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [element, setElement] = useState("");

  return (
    <QueryState query={query}>
      {(req) => {
        const open = OPEN_REQUEST.includes(req.status);
        const isExecutor = req.assignee === me?.id;
        const canWork = isExecutor || isDispatcher;
        const canVerify = (isEngineer || isDispatcher) && !isExecutor;
        const canAssign =
          isDispatcher && ["new", "accepted", "assigned", "in_progress"].includes(req.status);
        return (
          <>
            <header className="mb-6 rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 md:px-6">
                <div className="min-w-0">
                  <div className="label-tech mb-1.5">
                    Заявка <span className="text-ink">{req.number}</span> ·{" "}
                    {formatDateTime(req.created_at)} · источник: {req.source_label.toLowerCase()}
                  </div>
                  <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[28px]">
                    {req.category_label}
                  </h1>
                  <p className="mt-1.5 text-sm text-muted">
                    {req.building_address}
                    {req.entrance ? ` · подъезд ${req.entrance}` : ""}
                    {req.floor !== null ? ` · этаж ${req.floor}` : ""}
                    {req.apartment ? ` · кв. ${req.apartment}` : ""}
                    {req.place ? ` · ${req.place}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge {...REQUEST_STATUS[req.status]} />
                  <StatusBadge
                    {...REQUEST_PRIORITY[req.priority]}
                    label={`Приоритет: ${REQUEST_PRIORITY[req.priority].label.toLowerCase()}`}
                  />
                  {req.is_emergency && (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-critical/50 bg-critical-soft px-2 py-0.5 text-xs font-medium text-critical-ink">
                      <Siren className="size-3.5" />
                      {req.emergency_confirmed_at ? "Авария подтверждена" : "Отмечено как авария"}
                    </span>
                  )}
                </div>
              </div>
              <div className="border-t border-line px-5 py-4 md:px-6">
                <RequestProgress status={req.status} />
              </div>
            </header>

            {error ? (
              <div className="mb-4">
                <ErrorState error={error} />
              </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
              <div className="space-y-6">
                <Card index="A" title="Описание">
                  <p className="text-[15px] leading-relaxed whitespace-pre-line">
                    {req.description}
                  </p>
                  {req.resolution && (
                    <div className="mt-4 rounded-md border-l-2 border-accent bg-accent-soft px-3 py-2.5">
                      <div className="label-tech mb-1 !text-accent">
                        {req.status === "rejected" ? "Причина отклонения" : "Что сделано"}
                      </div>
                      <p className="text-sm">{req.resolution}</p>
                    </div>
                  )}
                </Card>
                <Card index="B" title="Фото проблемы">
                  <EvidenceGallery
                    targetType="service_request"
                    targetId={id}
                    kinds={["photo", "video"]}
                  />
                </Card>
                <Card index="C" title="Фото результата">
                  <EvidenceGallery
                    targetType="service_request"
                    targetId={id}
                    kinds={["repair_photo"]}
                    emptyTitle="Фото результата нет"
                    emptyText="Исполнитель прикладывает фото после выполнения работ — без него заявку нельзя отметить выполненной."
                  />
                  {canWork && req.status === "in_progress" && (
                    <MediaUpload
                      building={req.building}
                      targetType="service_request"
                      targetId={id}
                      photoKind="repair_photo"
                      label="Добавить фото результата"
                      onUploaded={() => query.refetch()}
                    />
                  )}
                </Card>
                <Card index="D" title="История">
                  <RequestHistory requestId={id} createdAt={req.created_at} />
                </Card>
              </div>

              <aside className="space-y-6">
                <Card title="Сведения">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <Field label="Заявитель">{req.author_name ?? req.source_label}</Field>
                    <Field label="Телефон" mono>
                      {req.contact_phone || "—"}
                    </Field>
                    <Field label="Ответственный">{req.assignee_name ?? "не назначен"}</Field>
                    <Field label="Срок" mono>
                      {formatDate(req.due_date)}
                    </Field>
                    <Field label="Приоритет">
                      {isDispatcher && open ? (
                        <select
                          value={req.priority}
                          onChange={(e) => prioritize.mutate({ priority: e.target.value })}
                          aria-label="Приоритет заявки"
                          className="h-8 rounded-md border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none"
                        >
                          {Object.entries(REQUEST_PRIORITY).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        REQUEST_PRIORITY[req.priority].label
                      )}
                    </Field>
                    {req.defect && (
                      <Field label="Дефект">
                        <Link
                          href={`/defects/${req.defect}`}
                          className="font-mono text-accent hover:underline"
                        >
                          {req.defect_number}
                        </Link>
                      </Field>
                    )}
                  </dl>
                </Card>

                {/* Executor (or the dispatcher on their behalf) */}
                {canWork && req.status === "assigned" && (
                  <Card title="Исполнитель">
                    <p className="mb-3 text-sm text-muted">
                      {isExecutor
                        ? "Задача назначена вам."
                        : `Задача назначена: ${req.assignee_name}.`}
                    </p>
                    <Button
                      className="w-full"
                      disabled={start.isPending}
                      onClick={() => start.mutate({ text: "" })}
                    >
                      Приступить к выполнению
                    </Button>
                  </Card>
                )}
                {canWork && req.status === "in_progress" && (
                  <Card title="Отметить выполнение">
                    <textarea
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      placeholder="Что сделано — житель увидит этот текст"
                      aria-label="Что сделано"
                      className={textarea}
                    />
                    {!req.has_result_photo && (
                      <p className="mt-2 text-xs text-warning-ink">
                        Сначала приложите фото результата (раздел C).
                      </p>
                    )}
                    <Button
                      className="mt-2 w-full"
                      disabled={!result.trim() || !req.has_result_photo || complete.isPending}
                      onClick={() => complete.mutate({ text: result })}
                    >
                      Выполнена
                    </Button>
                  </Card>
                )}

                {/* Check of the result: engineer or dispatcher, never the executor */}
                {canVerify && req.status === "done" && (
                  <Card title="Проверка результата">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Комментарий проверки; для возврата — что не так"
                      aria-label="Комментарий проверки"
                      className={textarea}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button disabled={verify.isPending} onClick={() => verify.mutate({ text })}>
                        Проверена
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!text.trim() || back.isPending}
                        onClick={() => back.mutate({ text })}
                      >
                        Вернуть в работу
                      </Button>
                    </div>
                  </Card>
                )}

                {isDispatcher && req.status === "verified" && (
                  <Card title="Закрытие">
                    <p className="mb-3 text-sm text-muted">
                      Результат проверен. Закройте заявку — житель получит уведомление.
                    </p>
                    <Button
                      className="w-full"
                      disabled={close.isPending}
                      onClick={() => close.mutate({ text: "" })}
                    >
                      Закрыть заявку
                    </Button>
                  </Card>
                )}

                {isDispatcher &&
                  ((req.is_emergency && !req.emergency_confirmed_at && open) || canAssign) && (
                    <Card title="Диспетчер">
                      <div className="space-y-5">
                        {req.is_emergency && !req.emergency_confirmed_at && (
                          <div className="rounded-md border border-critical/40 bg-critical-soft p-3">
                            <p className="text-sm text-critical-ink">
                              Отмечена авария. Подтверждение сразу оповестит все организации дома.
                              При угрозе жизни — звонок 112.
                            </p>
                            <Button
                              variant="danger"
                              size="sm"
                              className="mt-2"
                              icon={<Siren className="size-3.5" />}
                              onClick={() => emergency.mutate(undefined)}
                            >
                              Подтвердить аварию
                            </Button>
                          </div>
                        )}

                        {req.status === "new" && (
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => accept.mutate({ text: "" })}
                          >
                            Принять заявку
                          </Button>
                        )}

                        {canAssign && (
                          <div>
                            <div className="label-tech mb-2">
                              {req.assignee ? "Переназначить" : "Назначить ответственного"}
                            </div>
                            <select
                              value={who}
                              onChange={(e) => setWho(e.target.value)}
                              className={input}
                              aria-label="Ответственный"
                            >
                              <option value="">— выберите —</option>
                              {assignees.data?.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                  {a.position ? ` · ${a.position}` : ""} · в работе: {a.open_tasks}
                                </option>
                              ))}
                            </select>
                            <div className="mt-2 flex gap-2">
                              <input
                                type="date"
                                value={due}
                                onChange={(e) => setDue(e.target.value)}
                                className={input}
                                aria-label="Срок исполнения"
                              />
                              <Button
                                disabled={!who}
                                onClick={() =>
                                  assign.mutate({ assignee: who, due_date: due || null })
                                }
                              >
                                Назначить
                              </Button>
                            </div>
                          </div>
                        )}

                        {["new", "accepted"].includes(req.status) && (
                          <div>
                            <div className="label-tech mb-2">Отклонить</div>
                            <textarea
                              value={text}
                              onChange={(e) => setText(e.target.value)}
                              placeholder="Причина — житель увидит этот текст"
                              aria-label="Причина отклонения"
                              className={textarea}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="mt-2"
                              disabled={!text.trim()}
                              onClick={() => reject.mutate({ text })}
                            >
                              Отклонить заявку
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                {(isDispatcher || isEngineer) && open && !req.defect && (
                  <Card title="Передать инженеру как дефект">
                    <select
                      value={element}
                      onChange={(e) => setElement(e.target.value)}
                      className={input}
                      aria-label="Элемент здания"
                    >
                      <option value="">— элемент здания —</option>
                      {elements.data?.map((el) => (
                        <option key={el.id} value={el.id}>
                          {el.path.join(" → ")}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      icon={<TriangleAlert className="size-3.5" />}
                      disabled={!element}
                      onClick={() => toDefect.mutate({ element, defect_type: req.category_label })}
                    >
                      Создать дефект
                    </Button>
                  </Card>
                )}
              </aside>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
