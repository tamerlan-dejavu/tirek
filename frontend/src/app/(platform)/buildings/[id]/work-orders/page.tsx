"use client";

import { use } from "react";

import { Card } from "@/components/ui/Card";

import { WorkOrderList } from "@/components/lists/WorkOrderList";

export default function BuildingWorkOrders({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Card flush>
      <WorkOrderList buildingId={id} />
    </Card>
  );
}
