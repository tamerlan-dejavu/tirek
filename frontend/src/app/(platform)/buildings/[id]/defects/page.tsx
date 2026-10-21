"use client";

import { use } from "react";

import { Card } from "@/components/ui/Card";

import { DefectList } from "@/components/lists/DefectList";

export default function BuildingDefects({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Card flush>
      <DefectList buildingId={id} />
    </Card>
  );
}
