"use client";

import { use } from "react";

import { ElementTree } from "@/components/buildings/ElementTree";
import { Card } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import { useApi } from "@/lib/api/hooks";
import type { BuildingElement } from "@/lib/api/types";

export default function ElementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApi<BuildingElement[]>(`building-elements/?building=${id}`);
  return (
    <Card title="Конструктивные элементы и инженерные системы">
      <QueryState query={query} empty={(d) => d.length === 0}>
        {(elements) => <ElementTree elements={elements} />}
      </QueryState>
    </Card>
  );
}
