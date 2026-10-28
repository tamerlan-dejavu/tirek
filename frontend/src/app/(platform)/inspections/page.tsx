"use client";

import { useState } from "react";

import { AssignInspection } from "@/components/inspections/AssignInspection";
import { InspectionList } from "@/components/lists/InspectionList";
import { Card, PageHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Tabs";
import { useMe } from "@/lib/api/hooks";
import { can } from "@/lib/permissions";

type Filter = "all" | "draft" | "submitted" | "approved";

export default function InspectionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: me } = useMe();
  return (
    <>
      <PageHeader
        code="03 · Обследования"
        title="Обследования"
        subtitle="Черновик → на проверке → утверждено. Утверждённые результаты не переписываются — исправления выпускаются новой версией."
        actions={can.planInspection(me) ? <AssignInspection /> : undefined}
      />
      <Card
        flush
        title="Журнал обследований"
        actions={
          <Segmented<Filter>
            label="Статус"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Все" },
              { value: "draft", label: "Черновики" },
              { value: "submitted", label: "На проверке" },
              { value: "approved", label: "Утверждённые" },
            ]}
          />
        }
      >
        <InspectionList status={filter === "all" ? undefined : filter} />
      </Card>
    </>
  );
}
