"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";

import { RiskBadge, StatusBadge } from "@/components/ui/Badge";
import type { Defect, RiskCategory } from "@/lib/api/types";
import { DEFECT_STATUS } from "@/lib/status";

/**
 * Schematic elevation of a residential building with defect markers (brief §19, ТЗ 11.5).
 *
 * Honesty rules:
 *  - geometry is generated from passport data only (floors × entrances); unknown values are
 *    drawn as a neutral placeholder and labelled «неизвестно», never invented;
 *  - markers are placed by the element hierarchy (подъезд → кровля/фасад/подвал), i.e. by ZONE,
 *    not by coordinates — the title block says «схема, не в масштабе, расположение по зонам»;
 *  - engineering systems without a facade position get their own strip below the ground line;
 *  - every marker is reachable by keyboard and mirrored in the list below the drawing.
 */

type Zone = "roof" | "facade" | "basement" | "systems";

const ZONE_BY_TYPE: Record<string, Zone> = {
  roof: "roof",
  attic: "roof",
  facade: "facade",
  walls: "facade",
  balconies: "facade",
  columns: "facade",
  beams: "facade",
  slabs: "facade",
  basement: "basement",
  foundation: "basement",
  parking: "basement",
  territory: "basement",
};

const RISK_FILL: Record<RiskCategory, string> = {
  R1: "var(--color-r1)",
  R2: "var(--color-r2)",
  R3: "var(--color-r3)",
  R4: "var(--color-r4)",
};

const ZONE_LABEL: Record<Zone, string> = {
  roof: "Кровля",
  facade: "Фасад и конструкции",
  basement: "Подвал и основание",
  systems: "Инженерные системы",
};

function entranceOf(d: Defect): number | null {
  for (const part of d.element_path) {
    const m = part.match(/подъезд\s*№?\s*(\d+)/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function zoneOf(d: Defect): Zone {
  return ZONE_BY_TYPE[d.element_type] ?? (d.element_group === "engineering" ? "systems" : "facade");
}

interface Placed {
  defect: Defect;
  n: number;
  x: number;
  y: number;
  zone: Zone;
  entrance: number | null;
}

export function BuildingElevation({
  floors,
  entrances,
  defects,
  hrefFor = (d) => `/defects/${d.id}`,
  animate = true,
}: {
  floors: number | null;
  entrances: number | null;
  defects: Defect[];
  hrefFor?: (d: Defect) => string;
  animate?: boolean;
}) {
  const knownFloors = floors ?? null;
  const knownEntr = entrances ?? null;
  const F = Math.min(knownFloors ?? 5, 25);
  const E = Math.min(knownEntr ?? 1, 12);

  // Geometry (SVG units)
  const padL = 44;
  const padR = 52; // room for zone labels on the right
  const colW = Math.max(96, Math.min(150, 620 / E));
  const floorH = F > 14 ? 16 : 22;
  const roofH = 26;
  const top = 46;
  const bodyTop = top + roofH;
  const bodyH = F * floorH;
  const groundY = bodyTop + bodyH;
  const baseH = 30;
  const sysTop = groundY + baseH + 18;
  const sysH = 34;
  const W = padL + E * colW + padR;
  const H = sysTop + sysH + 34;
  const x0 = padL;
  const x1 = padL + E * colW;

  const placed = useMemo<Placed[]>(() => {
    const buckets = new Map<string, Defect[]>();
    for (const d of defects) {
      const z = zoneOf(d);
      const e = entranceOf(d);
      const key = `${z}:${z === "systems" ? 0 : (e ?? 0)}`;
      buckets.set(key, [...(buckets.get(key) ?? []), d]);
    }
    const out: Placed[] = [];
    let n = 0;
    const order: Zone[] = ["roof", "facade", "basement", "systems"];
    for (const z of order) {
      for (const [key, list] of [...buckets].filter(([k]) => k.startsWith(`${z}:`)).sort()) {
        const e = Number(key.split(":")[1]) || null;
        const cx = z === "systems" || !e ? (x0 + x1) / 2 : x0 + (Math.min(e, E) - 0.5) * colW;
        const cy =
          z === "roof" ? top + roofH / 2 + 2 : z === "facade" ? bodyTop + bodyH / 2 : z === "basement" ? groundY + baseH / 2 : sysTop + sysH / 2;
        list.forEach((d, i) => {
          n += 1;
          const spread = 22;
          out.push({ defect: d, n, zone: z, entrance: e, x: cx + (i - (list.length - 1) / 2) * spread, y: cy });
        });
      }
    }
    return out;
  }, [defects, E, colW, x0, x1, top, roofH, bodyTop, bodyH, groundY, baseH, sysTop, sysH]);

  const [active, setActive] = useState<string | null>(null);
  const activeItem = placed.find((p) => p.defect.id === active) ?? null;
  const drawCls = animate ? "draw-path" : undefined;

  return (
    <div>
      <div className="grid-blueprint-light relative overflow-x-auto rounded-md border border-line bg-canvas">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[520px]"
          role="img"
          aria-labelledby="elev-title elev-desc"
        >
          <title id="elev-title">Схема фасада: дефекты по зонам здания</title>
          <desc id="elev-desc">
            {`Схема, не в масштабе. ${knownFloors ?? "неизвестно"} этажей, ${knownEntr ?? "неизвестно"} подъездов. Отмечено дефектов: ${placed.length}. Полный список — под схемой.`}
          </desc>

          {/* dimension line: overall width */}
          <g className="text-[9px]" fill="var(--color-muted)" fontFamily="var(--font-mono)">
            <path d={`M${x0} ${top - 22}H${x1}M${x0} ${top - 26}v8M${x1} ${top - 26}v8`} stroke="var(--color-line-strong)" />
            <text x={(x0 + x1) / 2} y={top - 27} textAnchor="middle">
              {knownEntr ? `${knownEntr} подъезд(а)` : "число подъездов неизвестно"}
            </text>
          </g>

          {/* roof */}
          <path
            d={`M${x0 - 6} ${bodyTop}H${x1 + 6}M${x0} ${bodyTop}V${top + 6}H${x1}V${bodyTop}`}
            fill="none"
            stroke="var(--color-steel)"
            strokeWidth="1.4"
            className={drawCls}
            style={{ ["--len" as string]: 2 * (x1 - x0) + 80 }}
          />
          {/* body outline */}
          <rect
            x={x0}
            y={bodyTop}
            width={x1 - x0}
            height={bodyH}
            fill="var(--color-surface)"
            stroke="var(--color-steel)"
            strokeWidth="1.4"
            className={drawCls}
            style={{ ["--len" as string]: 2 * (x1 - x0 + bodyH) }}
          />
          {/* floor lines + windows */}
          {Array.from({ length: F - 1 }, (_, i) => (
            <path key={`f${i}`} d={`M${x0} ${bodyTop + (i + 1) * floorH}H${x1}`} stroke="var(--color-line)" strokeWidth="0.8" />
          ))}
          {Array.from({ length: E }, (_, e) =>
            Array.from({ length: F }, (_, f) =>
              [0.2, 0.62].map((p) => (
                <rect
                  key={`w${e}-${f}-${p}`}
                  x={x0 + e * colW + p * colW}
                  y={bodyTop + f * floorH + floorH * 0.28}
                  width={colW * 0.18}
                  height={floorH * 0.44}
                  fill="none"
                  stroke="var(--color-line-strong)"
                  strokeWidth="0.7"
                />
              )),
            ),
          )}
          {/* entrance divisions (structural axes) and labels */}
          {Array.from({ length: E }, (_, e) => {
            const cx = x0 + (e + 0.5) * colW;
            return (
              <g key={`e${e}`}>
                {e > 0 && (
                  <path d={`M${x0 + e * colW} ${top - 8}V${groundY + baseH + 4}`} stroke="var(--color-teal)" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="5 3 1 3" />
                )}
                <rect x={cx - 7} y={groundY - floorH * 0.8} width="14" height={floorH * 0.8} fill="var(--color-mist)" stroke="var(--color-steel)" strokeWidth="0.8" />
                <circle cx={cx} cy={H - 16} r="8" fill="var(--color-surface)" stroke="var(--color-steel)" strokeWidth="0.8" />
                <text x={cx} y={H - 13} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--color-ink)">
                  {knownEntr ? e + 1 : "?"}
                </text>
              </g>
            );
          })}
          {/* floor numbers */}
          {Array.from({ length: F }, (_, f) => (
            <text key={`fn${f}`} x={x0 - 8} y={bodyTop + (F - f - 0.5) * floorH + 3} textAnchor="end" fontSize="8.5" fontFamily="var(--font-mono)" fill="var(--color-faint)">
              {knownFloors ? f + 1 : ""}
            </text>
          ))}
          {!knownFloors && (
            <text x={(x0 + x1) / 2} y={bodyTop + bodyH / 2} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              этажность неизвестна
            </text>
          )}

          {/* ground and basement */}
          <path d={`M${x0 - 24} ${groundY}H${x1 + 16}`} stroke="var(--color-ink)" strokeWidth="1.2" />
          {Array.from({ length: Math.ceil((x1 - x0 + 40) / 8) }, (_, i) => (
            <path key={`h${i}`} d={`M${x0 - 24 + i * 8} ${groundY + 5}l5 -5`} stroke="var(--color-faint)" strokeWidth="0.6" />
          ))}
          <rect x={x0} y={groundY} width={x1 - x0} height={baseH} fill="none" stroke="var(--color-steel)" strokeWidth="1" strokeDasharray="4 3" />
          <text x={x0 - 8} y={groundY + baseH / 2 + 3} textAnchor="end" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-faint)">
            −1
          </text>

          {/* engineering systems strip */}
          <rect x={x0} y={sysTop} width={x1 - x0} height={sysH} rx="3" fill="var(--color-mist)" fillOpacity="0.6" stroke="var(--color-line-strong)" strokeWidth="0.8" />
          <text x={x0 + 8} y={sysTop + 11} fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-muted)" letterSpacing="0.08em">
            ИНЖЕНЕРНЫЕ СИСТЕМЫ · БЕЗ ПРИВЯЗКИ К ФАСАДУ
          </text>

          {/* zone labels on the right edge */}
          {(
            [
              ["КРОВЛЯ", top + roofH / 2 + 3],
              ["ПОДВАЛ", groundY + baseH / 2 + 3],
            ] as const
          ).map(([t, y]) => (
            <text key={t} x={x1 + 4} y={y} fontSize="7.5" fontFamily="var(--font-mono)" fill="var(--color-faint)">
              {t}
            </text>
          ))}

          {/* markers */}
          {placed.map((p) => {
            const risk = p.defect.approved_risk;
            const prelim = !risk;
            const isActive = active === p.defect.id;
            return (
              <g
                key={p.defect.id}
                tabIndex={0}
                role="button"
                aria-label={`Дефект ${p.n}: ${p.defect.defect_type}, ${risk ?? "оценка не утверждена"}, ${DEFECT_STATUS[p.defect.status].label}`}
                onMouseEnter={() => setActive(p.defect.id)}
                onFocus={() => setActive(p.defect.id)}
                onClick={() => setActive(p.defect.id)}
                className="cursor-pointer outline-none"
              >
                {isActive && <circle cx={p.x} cy={p.y} r="15" fill="none" stroke="var(--color-teal)" strokeWidth="1.5" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9.5"
                  fill={prelim ? "var(--color-surface)" : RISK_FILL[risk]}
                  stroke={prelim ? "var(--color-unknown)" : "var(--color-surface)"}
                  strokeWidth={prelim ? 1.4 : 1.5}
                  strokeDasharray={prelim ? "2.5 2" : undefined}
                />
                <text
                  x={p.x}
                  y={p.y + 3.2}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                  fill={prelim ? "var(--color-ink)" : "#fff"}
                >
                  {p.n}
                </text>
              </g>
            );
          })}

          {/* title block — like a drawing sheet stamp */}
          <g fontFamily="var(--font-mono)" fontSize="8" fill="var(--color-muted)">
            <rect x={W - 168} y={6} width={160} height={24} fill="var(--color-surface)" stroke="var(--color-line-strong)" strokeWidth="0.8" />
            <text x={W - 162} y={16} letterSpacing="0.06em">СХЕМА · НЕ В МАСШТАБЕ</text>
            <text x={W - 162} y={26} fill="var(--color-faint)">расположение по зонам</text>
          </g>
        </svg>

        {activeItem && (
          <div className="pointer-events-none absolute bottom-3 left-3 hidden max-w-xs rounded-md border border-line bg-surface p-3 shadow-[var(--shadow-overlay)] sm:block">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">{activeItem.defect.number}</span>
              <StatusBadge {...DEFECT_STATUS[activeItem.defect.status]} />
            </div>
            <div className="mt-1 text-sm font-medium text-ink">{activeItem.defect.defect_type}</div>
            <div className="mt-0.5 text-xs text-muted">{activeItem.defect.element_path.join(" → ")}</div>
          </div>
        )}
      </div>

      {/* accessible equivalent + legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {(["R1", "R2", "R3", "R4"] as RiskCategory[]).map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: RISK_FILL[r] }} />
            <span className="font-mono">{r}</span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-dashed border-unknown" /> оценка не утверждена
        </span>
      </div>
      {placed.length > 0 && (
        <ol className="mt-3 divide-y divide-line rounded-md border border-line bg-surface" aria-label="Дефекты на схеме">
          {placed.map((p) => (
            <li key={p.defect.id}>
              <Link
                href={hrefFor(p.defect)}
                onMouseEnter={() => setActive(p.defect.id)}
                onFocus={() => setActive(p.defect.id)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-teal-soft/40",
                  active === p.defect.id && "bg-teal-soft/40",
                )}
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[10px]">
                  {p.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{p.defect.defect_type}</span>
                  <span className="block truncate text-xs text-muted">
                    {ZONE_LABEL[p.zone]}
                    {p.entrance ? ` · подъезд ${p.entrance}` : ""} · {p.defect.location || p.defect.element_path.join(" → ")}
                  </span>
                </span>
                {p.defect.approved_risk ? (
                  <RiskBadge category={p.defect.approved_risk} size="sm" />
                ) : (
                  <RiskBadge category={p.defect.preliminary_severity} preliminary size="sm" />
                )}
                <span className="hidden sm:block">
                  <StatusBadge {...DEFECT_STATUS[p.defect.status]} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
