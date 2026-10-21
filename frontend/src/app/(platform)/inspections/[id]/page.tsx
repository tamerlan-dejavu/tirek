"use client";

import Link from "next/link";
import { use, useState } from "react";

import { DefectList } from "@/components/lists/DefectList";
import { ApprovalTag, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, QueryState } from "@/components/ui/States";
import { useAction, useApi, useMe } from "@/lib/api/hooks";
import type { Inspection } from "@/lib/api/types";
import { can } from "@/lib/permissions";
import { formatDate, INSPECTION_STATUS } from "@/lib/status";

/** Review screen (UC-05, UC-07, UC-08). Buttons mirror server rules; the server decides. */
export default function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  const query = useApi<Inspection>(`inspections/${id}/`);
  const [comment, setComment] = useState("");
  const keys = [[`inspections/${id}/`]];

  const submit = useAction(`inspections/${id}/submit/`, keys);
  const approve = useAction(`inspections/${id}/approve/`, keys);
  const ret = useAction<{ comment: string }>(`inspections/${id}/return/`, keys);
  const publish = useAction(`inspections/${id}/publish/`, keys);
  const report = useAction<{ inspection: string }>("reports/generate/");
  const error = submit.error ?? approve.error ?? ret.error ?? publish.error ?? report.error;

  return (
    <QueryState query={query}>
      {(i) => (
        <>
          <PageHeader
            title={`Обследование ${i.number}`}
            subtitle={<>{i.building_address} · {i.assignee_name} · план {formatDate(i.planned_date)}</>}
            actions={
              <>
                <StatusBadge label={INSPECTION_STATUS[i.status]} />
                {i.is_published && <ApprovalTag approved />}
              </>
            }
          />
          {error && <div className="mb-4"><ErrorState error={error} /></div>}

          <div className="mb-6 flex flex-wrap gap-2">
            {(i.status === "draft" || i.status === "returned") && i.assignee === me?.id && (
              <>
                <Link href={`/inspections/${id}/fill`}><Button size="lg">Заполнить чек-лист</Button></Link>
                <Button variant="secondary" size="lg" onClick={() => submit.mutate(undefined)}>Отправить на проверку</Button>
              </>
            )}
            {i.status === "submitted" && can.review(me) && (
              <Button onClick={() => approve.mutate(undefined)}>Утвердить</Button>
            )}
            {i.status === "approved" && can.planInspection(me) && !i.is_published && (
              <Button onClick={() => publish.mutate(undefined)}>Опубликовать для ОСИ</Button>
            )}
            {i.status === "approved" && can.review(me) && (
              <Button variant="secondary" onClick={() => report.mutate({ inspection: id })}>
                {report.isPending ? "Формирование PDF…" : "Сформировать PDF"}
              </Button>
            )}
          </div>

          {i.status === "submitted" && can.review(me) && (
            <Card title="Вернуть на доработку" className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-24 w-full rounded-sm border border-line p-2 text-sm"
                placeholder="Что нужно исправить или дополнить"
                aria-label="Комментарий"
              />
              <Button variant="danger" className="mt-2" disabled={!comment.trim()} onClick={() => ret.mutate({ comment })}>
                Вернуть
              </Button>
            </Card>
          )}

          <Card title="Дефекты обследования">
            <DefectList buildingId={i.building} inspectionId={i.id} />
          </Card>
        </>
      )}
    </QueryState>
  );
}
