"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/States";
import type { Paginated } from "@/lib/api/client";
import { useApi } from "@/lib/api/hooks";
import type { Building } from "@/lib/api/types";
import { orUnknown } from "@/lib/status";

/** Small schematic glyph generated from the passport: floors × entrances. */
function Glyph({ floors, entrances }: { floors: number | null; entrances: number | null }) {
  const f = Math.min(floors ?? 5, 16);
  const e = Math.min(entrances ?? 1, 8);
  const w = 64;
  const h = 46;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-16 shrink-0" aria-hidden>
      <rect x="4" y={h - 4 - f * 2.4} width={w - 8} height={f * 2.4} fill="var(--color-surface)" stroke="var(--color-steel)" strokeWidth="1" />
      {Array.from({ length: e - 1 }, (_, i) => (
        <path key={i} d={`M${4 + ((i + 1) * (w - 8)) / e} ${h - 4 - f * 2.4}V${h - 4}`} stroke="var(--color-accent)" strokeOpacity=".6" strokeWidth=".8" strokeDasharray="2 1.5" />
      ))}
      <path d={`M0 ${h - 4}H${w}`} stroke="var(--color-ink)" strokeWidth="1" />
      {!floors && (
        <text x={w / 2} y={h - 8} fontSize="7" textAnchor="middle" fill="var(--color-muted)">
          ?
        </text>
      )}
    </svg>
  );
}

export default function BuildingsPage() {
  const [search, setSearch] = useState("");
  const query = useApi<Paginated<Building>>(`buildings/?search=${encodeURIComponent(search)}`);

  return (
    <>
      <PageHeader
        code="02 · Реестр объектов"
        title="Дома"
        subtitle="Объекты, по которым ваша организация ведёт техническое сопровождение"
        actions={
          <label className="flex h-9 w-72 items-center gap-2 rounded-md border border-line bg-surface px-2.5 focus-within:border-accent">
            <Search aria-hidden className="size-4 text-faint" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Адрес или идентификатор"
              aria-label="Поиск домов"
              className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </label>
        }
      />
      <QueryState query={query} empty={(d) => d.results.length === 0} emptyTitle="Домов не найдено">
        {(data) => (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.results.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/buildings/${b.id}`}
                  className="group block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-accent/70"
                >
                  <div className="flex items-start gap-4">
                    <Glyph floors={b.floors} entrances={b.entrances} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] text-muted">{b.internal_code}</div>
                      <div className="truncate font-medium text-ink group-hover:text-accent-strong">{b.address}</div>
                      <div className="mt-0.5 text-xs text-muted">{b.city}</div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
                    {[
                      ["Год", orUnknown(b.year_built)],
                      ["Этажей", orUnknown(b.floors)],
                      ["Подъездов", orUnknown(b.entrances)],
                      ["Паспорт", `${b.completeness}%`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="label-tech !text-[10px]">{k}</dt>
                        <dd className={v === "неизвестно" ? "mt-0.5 text-[11px] text-muted" : "mt-0.5 font-mono text-sm tabular"}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </>
  );
}
