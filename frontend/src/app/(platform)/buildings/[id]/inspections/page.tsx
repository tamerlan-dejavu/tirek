"use client";

import { use } from "react";

import { InspectionList } from "@/components/lists/InspectionList";

export default function BuildingInspections({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InspectionList buildingId={id} />;
}
