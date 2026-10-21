"use client";

import { use, type ReactNode } from "react";

import { BuildingTabs } from "@/components/buildings/BuildingTabs";
import { PageHeader } from "@/components/ui/Card";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";

export default function BuildingLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: b } = useApi<Building>(`buildings/${id}/`);
  return (
    <>
      <PageHeader
        title={b ? b.address : "…"}
        subtitle={b && <span className="font-mono">{b.internal_code} · паспорт заполнен на {b.completeness}%</span>}
      />
      <BuildingTabs id={id} />
      {children}
    </>
  );
}
