"use client";

import { use } from "react";

import { DefectList } from "@/components/lists/DefectList";

export default function BuildingDefects({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DefectList buildingId={id} />;
}
