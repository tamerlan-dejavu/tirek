"use client";

import { use } from "react";

import { Card } from "@/components/ui/Card";

import { InspectionList } from "@/components/lists/InspectionList";

export default function BuildingInspections({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Card flush>
      <InspectionList buildingId={id} />
    </Card>
  );
}
