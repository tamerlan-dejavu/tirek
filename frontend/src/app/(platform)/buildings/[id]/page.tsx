"use client";

import { use } from "react";

import { DefectList } from "@/components/lists/DefectList";
import { WorkOrderList } from "@/components/lists/WorkOrderList";
import { Card } from "@/components/ui/Card";

/** Overview — built only from approved data, no unapproved ratings (ТЗ 11.4). */
export default function BuildingOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Открытые дефекты">
        <DefectList buildingId={id} />
      </Card>
      <Card title="Ближайшие мероприятия">
        <WorkOrderList buildingId={id} extraParams={{ ordering: "planned_date" }} />
      </Card>
    </div>
  );
}
