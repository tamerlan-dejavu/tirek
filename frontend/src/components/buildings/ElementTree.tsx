import clsx from "clsx";

import type { BuildingElement } from "@/lib/api/types";

/**
 * Element hierarchy (Дом → Подъезд №2 → Кровля → Участок) drawn as a technical tree
 * with connector lines. A schematic, not a spatial model (ТЗ 11.5).
 */
export function ElementTree({ elements, counts }: { elements: BuildingElement[]; counts?: Record<string, number> }) {
  const byParent = new Map<string | null, BuildingElement[]>();
  for (const e of elements) byParent.set(e.parent, [...(byParent.get(e.parent) ?? []), e]);

  const render = (parent: string | null, depth: number) => (
    <ul className={clsx(depth > 0 && "ml-3 border-l border-line pl-4")}>
      {(byParent.get(parent) ?? []).map((e) => (
        <li key={e.id} className="relative">
          {depth > 0 && <span aria-hidden className="absolute top-[18px] -left-4 h-px w-3 bg-line" />}
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-2 text-sm">
              <span className={clsx("size-1.5 rounded-[1px]", depth === 0 ? "bg-steel" : "bg-accent")} aria-hidden />
              <span className="text-ink">{e.name}</span>
              {e.location && <span className="text-muted">· {e.location}</span>}
            </span>
            <span className="flex items-center gap-3">
              {counts?.[e.id] ? <span className="font-mono text-xs text-warning-ink">{counts[e.id]} деф.</span> : null}
              <span className="font-mono text-[10px] tracking-wide text-faint uppercase">{e.element_type}</span>
            </span>
          </div>
          {render(e.id, depth + 1)}
        </li>
      ))}
    </ul>
  );

  return (
    <figure>
      {render(null, 0)}
      <figcaption className="label-tech mt-4 border-t border-line pt-3">Иерархия элементов · схема, не в масштабе</figcaption>
    </figure>
  );
}
