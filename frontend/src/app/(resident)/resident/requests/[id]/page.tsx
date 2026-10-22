"use client";

import { ArrowLeft, Siren } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { EvidenceGallery } from "@/components/defects/EvidenceGallery";
import { RequestHistory, RequestProgress } from "@/components/requests/RequestTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { ServiceRequest } from "@/lib/api/types";
import { formatDate, formatDateTime, REQUEST_STATUS } from "@/lib/status";

export default function ResidentRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApi<ServiceRequest>(`service-requests/${id}/`);

  return (
    <QueryState query={query}>
      {(r) => (
        <div className="mx-auto max-w-2xl space-y-6">
          <Link
            href="/resident"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Мой дом
          </Link>
          <div>
            <div className="label-tech mb-2">
              Заявка {r.number} · {formatDateTime(r.created_at)}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[clamp(1.5rem,3.6vw,2rem)] leading-tight font-bold tracking-[-0.025em]">
                {r.category_label}
              </h1>
              <StatusBadge {...REQUEST_STATUS[r.status]} />
            </div>
            {r.is_emergency && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-critical-ink">
                <Siren className="size-4" />{" "}
                {r.emergency_confirmed_at
                  ? "Авария подтверждена, службы оповещены"
                  : "Отмечено как авария"}
              </p>
            )}
          </div>

          <Card>
            <RequestProgress status={r.status} />
            {r.status === "rejected" && (
              <p className="mt-4 text-sm text-muted">Заявка отклонена.</p>
            )}
            {r.status === "done" && (
              <p className="mt-4 text-sm text-muted">
                Исполнитель отметил выполнение — результат проверит инженер или диспетчер.
              </p>
            )}
          </Card>

          {(r.resolution || r.assignee_name) && (
            <Card title="Ответ">
              {r.assignee_name && (
                <p className="text-sm text-muted">
                  Исполнитель: <span className="text-ink">{r.assignee_name}</span>
                  {r.due_date && <> · срок {formatDate(r.due_date)}</>}
                </p>
              )}
              {r.resolution && <p className="mt-2 text-[15px]">{r.resolution}</p>}
            </Card>
          )}

          <Card title="Ваше сообщение">
            <p className="text-sm text-muted">
              {r.entrance ? `Подъезд ${r.entrance}` : ""}
              {r.floor !== null ? ` · этаж ${r.floor}` : ""}
              {r.apartment ? ` · кв. ${r.apartment}` : ""}
              {r.place ? ` · ${r.place}` : ""}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{r.description}</p>
            <div className="mt-4">
              <EvidenceGallery
                targetType="service_request"
                targetId={id}
                kinds={["photo", "video"]}
              />
            </div>
          </Card>

          {["done", "verified", "closed"].includes(r.status) && (
            <Card title="Фото результата">
              <EvidenceGallery
                targetType="service_request"
                targetId={id}
                kinds={["repair_photo"]}
                emptyTitle="Фото результата нет"
                emptyText="Исполнитель не приложил фото."
              />
            </Card>
          )}

          <Card title="История">
            <RequestHistory requestId={id} createdAt={r.created_at} />
          </Card>
        </div>
      )}
    </QueryState>
  );
}
