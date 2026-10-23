"use client";

import { ClipboardCheck, FileText, Send, Undo2 } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { DefectList } from "@/components/lists/DefectList";
import { ApprovalTag, StatusBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { Inspection } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { formatDate, INSPECTION_STATUS } from "@/lib/status";

const STEPS: Inspection["status"][] = ["draft", "submitted", "approved"];

/** Review workspace (UC-04 … UC-08). Buttons mirror server rules; the server decides. */
export default function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const query = useApi<Inspection>(`inspections/${id}/`);
  const missing = useApi<{ missing: { code: string; problem: string }[] }>(`inspections/${id}/completeness/`);
  const [comment, setComment] = useState("");
  const keys = [[`inspections/${id}/`], [`inspections/${id}/completeness/`]];

  const submit = useAction(`inspections/${id}/submit/`, keys);
  const approve = useAction(`inspections/${id}/approve/`, keys);
  const ret = useAction<{ comment: string }>(`inspections/${id}/return/`, keys);
  const publish = useAction(`inspections/${id}/publish/`, keys);
  const report = useAction<{ inspection: string }>("reports/generate/");
  const error = submit.error ?? approve.error ?? ret.error ?? publish.error ?? report.error;

  return (
    <QueryState query={query}>
      {(i) => {
        const editable = (i.status === "draft" || i.status === "returned") && i.assignee === me?.id;
        const stepIdx = STEPS.indexOf(i.status === "returned" ? "draft" : i.status);
        return (
          <>
            <header className="mb-6 rounded-lg border border-line bg-surface">
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
                <div>
                  <div className="label-tech mb-1.5">03 · Обследование · регулярный визуальный осмотр</div>
                  <h1 className="font-mono text-[24px] leading-tight font-medium tracking-tight">
                    {i.number}
                    {i.version > 1 && <span className="text-muted"> · v{i.version}</span>}
                  </h1>
                  <Link href={`/buildings/${i.building}`} className="mt-1 block text-sm text-muted hover:text-accent-strong">
                    {i.building_address}
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge {...INSPECTION_STATUS[i.status]} />
                  {i.is_published ? <ApprovalTag approved>Опубликовано для ОСИ</ApprovalTag> : <span className="text-xs text-muted">не опубликовано</span>}
                </div>
              </div>
              <ol className="grid grid-cols-3 border-t border-line">
                {STEPS.map((s, n) => (
                  <li key={s} className={n <= stepIdx ? "border-t-2 border-accent px-5 py-3" : "border-t-2 border-transparent px-5 py-3"}>
                    <div className="label-tech">Шаг {n + 1}</div>
                    <div className={n === stepIdx ? "text-sm font-medium" : "text-sm text-muted"}>{INSPECTION_STATUS[s].label}</div>
                  </li>
                ))}
              </ol>
            </header>

            {error ? (
              <div className="mb-4">
                <ErrorState error={error} />
              </div>
            ) : null}
            {i.status === "returned" && (
              <p className="mb-4 rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-ink">
                Обследование возвращено на доработку. Комментарии инженера — в истории проверок.
              </p>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
              <Card index="A" title="Дефекты обследования" flush>
                <DefectList buildingId={i.building} inspectionId={i.id} showFilters={false} compact />
              </Card>

              <aside className="space-y-6">
                <Card title="Действия">
                  <div className="flex flex-col gap-2">
                    {editable && (
                      <>
                        <ButtonLink href={`/inspections/${id}/fill`} size="lg" icon={<ClipboardCheck className="size-4" />}>
                          Заполнить чек-лист
                        </ButtonLink>
                        {!!missing.data?.missing.length && (
                          <p className="text-xs text-warning-ink">
                            Не заполнено обязательных пунктов: <span className="font-mono">{missing.data.missing.length}</span>
                          </p>
                        )}
                        <Button variant="secondary" size="lg" icon={<Send className="size-4" />} onClick={() => submit.mutate(undefined)} disabled={submit.isPending}>
                          Отправить на проверку
                        </Button>
                      </>
                    )}
                    {i.status === "submitted" && can.review(me) && (
                      <Button onClick={() => approve.mutate(undefined)} disabled={approve.isPending}>
                        Утвердить обследование
                      </Button>
                    )}
                    {i.status === "approved" && can.planInspection(me) && !i.is_published && (
                      <Button onClick={() => publish.mutate(undefined)}>Опубликовать для ОСИ</Button>
                    )}
                    {i.status === "approved" && can.review(me) && (
                      <Button variant="secondary" icon={<FileText className="size-4" />} onClick={() => report.mutate({ inspection: id })} disabled={report.isPending}>
                        {report.isPending ? "Постановка в очередь…" : report.isSuccess ? "PDF формируется — см. «Отчёты»" : "Сформировать PDF-отчёт"}
                      </Button>
                    )}
                    {!editable && i.status !== "submitted" && i.status !== "approved" && <p className="text-sm text-muted">Нет доступных действий для вашей роли.</p>}
                  </div>
                  {i.status === "submitted" && can.review(me) && (
                    <div className="mt-4 border-t border-line pt-4">
                      <div className="label-tech mb-2">Вернуть на доработку</div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-20 w-full rounded-md border border-line p-2.5 text-sm focus:border-accent focus:outline-none"
                        placeholder="Что нужно исправить или дополнить"
                        aria-label="Комментарий для возврата"
                      />
                      <Button variant="danger" size="sm" className="mt-2" icon={<Undo2 className="size-3.5" />} disabled={!comment.trim()} onClick={() => ret.mutate({ comment })}>
                        Вернуть
                      </Button>
                    </div>
                  )}
                </Card>

                <Card title="Реквизиты">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <Field label="Исполнитель">{i.assignee_name}</Field>
                    <Field label="Плановая дата" mono>{formatDate(i.planned_date)}</Field>
                    <Field label="Утверждено" mono>{formatDate(i.approved_at)}</Field>
                    <Field label="Версия" mono>v{i.version}</Field>
                  </dl>
                </Card>
              </aside>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
