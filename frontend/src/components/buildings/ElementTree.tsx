import type { BuildingElement } from "@/lib/api/types";

/**
 * Element hierarchy (Дом → Подъезд №2 → Кровля → Участок).
 * A schematic, not a spatial model — labelled accordingly (ТЗ 11.5).
 */
export function ElementTree({ elements, counts }: { elements: BuildingElement[]; counts?: Record<string, number> }) {
  const byParent = new Map<string | null, BuildingElement[]>();
  for (const e of elements) byParent.set(e.parent, [...(byParent.get(e.parent) ?? []), e]);

  const render = (parent: string | null, depth: number) =>
    (byParent.get(parent) ?? []).map((e) => (
      <li key={e.id}>
        <div className="flex items-center justify-between border-b border-line py-1.5" style={{ paddingLeft: depth * 16 }}>
          <span>{e.name}{e.location && <span className="text-ink-muted"> · {e.location}</span>}</span>
          {counts?.[e.id] ? <span className="font-mono text-xs text-risk-r2">{counts[e.id]} деф.</span> : null}
        </div>
        <ul>{render(e.id, depth + 1)}</ul>
      </li>
    ));

  return (
    <figure>
      <ul className="text-sm">{render(null, 0)}</ul>
      <figcaption className="mt-2 text-xs text-ink-muted">Схема, не в масштабе.</figcaption>
    </figure>
  );
}
