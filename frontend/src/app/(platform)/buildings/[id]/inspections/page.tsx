"use client";

import { use } from "react";

import { AssignInspection } from "@/components/inspections/AssignInspection";
import { Card } from "@/components/ui/Card";
import { useMe } from "@/lib/api/hooks";
import { can } from "@/lib/permissions";

import { InspectionList } from "@/components/lists/InspectionList";

export default function BuildingInspections({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: me } = useMe();
  return (
    <Card flush title="Обследования здания" actions={can.planInspection(me) ? <AssignInspection buildingId={id} /> : undefined}>
      <InspectionList buildingId={id} />
    </Card>
  );
}
