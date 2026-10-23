"use client";

import { Plus } from "lucide-react";

import { DefectList } from "@/components/lists/DefectList";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useMe } from "@/lib/api/hooks";
import { can } from "@/lib/permissions";

export default function DefectsPage() {
  const { data: me } = useMe();
  return (
    <>
      <PageHeader
        code="04 · Реестр дефектов"
        title="Дефекты"
        subtitle="Каждый дефект: объект, элемент, категория, степень опасности R1–R4 (критический → низкий), приоритет и статус устранения. Предварительные оценки отмечены пунктиром."
        actions={
          can.inspect(me) ? (
            <ButtonLink href="/defects/new" icon={<Plus className="size-4" />}>
              Новый дефект
            </ButtonLink>
          ) : null
        }
      />
      <Card flush>
        <DefectList />
      </Card>
    </>
  );
}
