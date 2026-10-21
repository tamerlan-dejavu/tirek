"use client";

import { use } from "react";

import { WorkOrderList } from "@/components/lists/WorkOrderList";

export default function BuildingWorkOrders({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorkOrderList buildingId={id} />;
}
