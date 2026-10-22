"use client";

import { Siren, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { EvidenceGallery } from "@/components/defects/EvidenceGallery";
import { RequestHistory, RequestProgress } from "@/components/requests/RequestTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { BuildingElement, ServiceRequest } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { formatDate, formatDateTime, REQUEST_STATUS } from "@/lib/status";

interface Assignee {
  id: string;
  name: string;
  position: string;
  open_tasks: number;
}

const input = "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none";

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const query = useApi<ServiceRequest>(`service-requests/${id}/`);
  const r = query.data;
  const isDispatcher = can.dispatch(me);
  const assignees = useApi<Assignee[]>(r && isDispatcher ? `service-requests/assignees/?building=${r.building}` : null);
  const elements = useApi<BuildingElement[]>(r && isDispatcher && !r.defect ? `building-elements/?building=${r.building}` : null);

  const keys = [[`service-requests/${id}/`], [`service-requests/${id}/events/`]];
  const accept = useAction<{ text: string }>(`service-requests/${id}/accept/`, keys);
  const assign = useAction<{ assignee: string; due_date: string | null }>(`service-requests/${id}/assign/`, keys);
  const resolve = useAction<{ text: string }>(`service-requests/${id}/resolve/`, keys);
  const reject = useAction<{ text: string }>(`service-requests/${id}/reject/`, keys);
  const emergency = useAction(`service-requests/${id}/confirm-emergency/`, keys);
  const toDefect = useAction<{ element: string; defect_type: string }>(`service-requests/${id}/create-defect/`, keys);
  const error = accept.error ?? assign.error ?? resolve.error ?? reject.error ?? emergency.error ?? toDefect.error;

  const [who, setWho] = useState("");
  const [due, setDue] = useState("");
  const [text, setText] = useState("");
  const [element, setElement] = useState("");

  return (
    <QueryState query={query}>
      {(req) => {
        const open = ["new", "accepted", "in_progress"].includes(req.status);
        const canResolve = open && (isDispatcher || req.assignee === me?.id);
        return (
          <>
            <header className="mb-6 rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4 md:px-6">
                <div className="min-w-0">
                  <div className="label-tech mb-1.5">
                    Заявка жителя <span className="text-ink">{req.number}</span> · {formatDateTime(req.created_at)}
                  </div>
                  <h1 className="text-[24px] leading-tight font-bold tracking-[-0.02em] md:text-[28px]">{req.category_label}</h1>
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
                  {req.is_emergency && (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-critical/50 bg-critical-soft px-2 py-0.5 text-xs font-medium text-critical-ink">
                      <Siren className="size-3.5" />
                      {req.emergency_confirmed_at ? "Авария подтверждена" : "Житель отметил аварию"}
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
                <Card index="A" title="Описание жителя">
                  <p className="text-[15px] leading-relaxed whitespace-pre-line">{req.description}</p>
                  {req.resolution && (
                    <div className="mt-4 rounded-md border-l-2 border-accent bg-accent-soft px-3 py-2.5">
                      <div className="label-tech mb-1 !text-accent">{req.status === "rejected" ? "Причина отклонения" : "Что сделано"}</div>
                      <p className="text-sm">{req.resolution}</p>
                    </div>
                  )}
                </Card>
                <Card index="B" title="Фото и видео">
                  <EvidenceGallery targetType="service_request" targetId={id} />
                </Card>
                <Card index="C" title="История">
                  <RequestHistory requestId={id} createdAt={req.created_at} />
                </Card>
              </div>

              <aside className="space-y-6">
                <Card title="Сведения">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <Field label="Житель">{req.author_name ?? "по телефону"}</Field>
                    <Field label="Телефон" mono>{req.contact_phone || "—"}</Field>
                    <Field label="Исполнитель">{req.assignee_name ?? "не назначен"}</Field>
                    <Field label="Срок" mono>{formatDate(req.due_date)}</Field>
                    {req.defect && (
                      <Field label="Дефект">
                        <Link href={`/defects/${req.defect}`} className="font-mono text-accent hover:underline">
                          {req.defect_number}
                        </Link>
                      </Field>
                    )}
                  </dl>
                </Card>

                {isDispatcher && open && (
                  <Card title="Диспетчер">
                    <div className="space-y-5">
                      {req.is_emergency && !req.emergency_confirmed_at && (
                        <div className="rounded-md border border-critical/40 bg-critical-soft p-3">
                          <p className="text-sm text-critical-ink">
                            Житель отметил аварию. Подтверждение сразу оповестит все организации дома. При угрозе жизни — звонок 112.
                          </p>
                          <Button variant="danger" size="sm" className="mt-2" icon={<Siren className="size-3.5" />} onClick={() => emergency.mutate(undefined)}>
                            Подтвердить аварию
                          </Button>
                        </div>
                      )}

                      {req.status === "new" && (
                        <Button variant="secondary" className="w-full" onClick={() => accept.mutate({ text: "" })}>
                          Принять заявку
                        </Button>
                      )}

                      <div>
                        <div className="label-tech mb-2">Назначить исполнителя</div>
                        <select value={who} onChange={(e) => setWho(e.target.value)} className={input} aria-label="Исполнитель">
                          <option value="">— выберите —</option>
                          {assignees.data?.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                              {a.position ? ` · ${a.position}` : ""} · задач: {a.open_tasks}
                            </option>
                          ))}
                        </select>
                        <div className="mt-2 flex gap-2">
                          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} aria-label="Срок исполнения" />
                          <Button disabled={!who} onClick={() => assign.mutate({ assignee: who, due_date: due || null })}>
                            Назначить
                          </Button>
                        </div>
                      </div>

                      {!req.defect && (
                        <div>
                          <div className="label-tech mb-2">Передать инженеру как дефект</div>
                          <select value={element} onChange={(e) => setElement(e.target.value)} className={input} aria-label="Элемент здания">
                            <option value="">— элемент здания —</option>
                            {elements.data?.map((el) => (
                              <option key={el.id} value={el.id}>
                                {el.path.join(" → ")}
                              </option>
                            ))}
                          </select>
                          <Button variant="secondary" size="sm" className="mt-2" icon={<TriangleAlert className="size-3.5" />} disabled={!element} onClick={() => toDefect.mutate({ element, defect_type: req.category_label })}>
                            Создать дефект
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {canResolve && (
                  <Card title="Закрыть заявку">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Что сделано или почему отклонено — житель увидит этот текст" aria-label="Комментарий для жителя" className="min-h-24 w-full rounded-md border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button disabled={!text.trim()} onClick={() => resolve.mutate({ text })}>
                        Решена
                      </Button>
                      {isDispatcher && (
                        <Button variant="danger" disabled={!text.trim()} onClick={() => reject.mutate({ text })}>
                          Отклонить
                        </Button>
                      )}
                    </div>
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
