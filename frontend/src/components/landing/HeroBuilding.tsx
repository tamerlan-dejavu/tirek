/**
 * Hero visual: an elevation drawing of a 9-storey panel building drawn on a blueprint grid.
 * Outline draws itself, then axes, dimensions and three inspection callouts appear.
 * It is explicitly a schematic with demo annotations — not a digital twin.
 */

const W = 720;
const H = 560;
const X0 = 100;
const X1 = 460;
const TOP = 110;
const FLOOR = 34;
const FLOORS = 9;
const GROUND = TOP + 26 + FLOOR * FLOORS; // 446
const COLS = 4;
const COLW = (X1 - X0) / COLS;

const CALLOUTS = [
  { x: X0 + COLW * 1.5, y: TOP + 13, lx: 710, ly: 96, code: "КР-02", text: "Протечка кровли", risk: "R2", color: "#C58B35", anchor: "end" as const },
  { x: X0 + COLW * 2.62, y: TOP + 26 + FLOOR * 4.5, lx: 710, ly: 262, code: "ФС-01", text: "Раскрытие шва", risk: "R3", color: "#6E97B3", anchor: "end" as const },
  { x: X0 + COLW * 0.7, y: GROUND + 22, lx: 20, ly: 538, code: "ОТ-01", text: "Коррозия трубопровода", risk: "R1", color: "#D06A6A", anchor: "start" as const },
];

export function HeroBuilding() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="hero-svg-title">
      <title id="hero-svg-title">Схема фасада жилого дома с отметками обследования (демонстрационные данные)</title>
      <defs>
        <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#20A6A6" strokeOpacity="0.09" strokeWidth="0.6" />
        </pattern>
        <pattern id="bp-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="#20A6A6" strokeOpacity="0.16" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#bp-grid)" />
      <rect width={W} height={H} fill="url(#bp-grid-major)" />

      {/* structural axes А–Д with bubbles */}
      {Array.from({ length: COLS + 1 }, (_, i) => {
        const x = X0 + i * COLW;
        return (
          <g key={i} className="animate-[fade-up_700ms_var(--ease-precise)_both]" style={{ animationDelay: `${900 + i * 90}ms` }}>
            <path d={`M${x} 52V${GROUND + 40}`} stroke="#20A6A6" strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="10 4 2 4" />
            <circle cx={x} cy="40" r="11" fill="#101D2C" stroke="#20A6A6" strokeOpacity="0.7" />
            <text x={x} y="44" textAnchor="middle" fontSize="11" fill="#9FD9D9" fontFamily="var(--font-mono)">
              {"АБВГД"[i]}
            </text>
          </g>
        );
      })}

      {/* roof + body outline: line-drawing */}
      <path
        className="draw-path"
        style={{ ["--len" as string]: 2400 }}
        d={`M${X0 - 8} ${TOP + 26}H${X1 + 8}M${X0} ${TOP + 26}V${TOP}H${X1}V${TOP + 26}M${X0} ${TOP + 26}V${GROUND}M${X1} ${TOP + 26}V${GROUND}`}
        fill="none"
        stroke="#E7EEF3"
        strokeWidth="1.6"
      />
      {/* floors */}
      {Array.from({ length: FLOORS - 1 }, (_, i) => (
        <path
          key={i}
          d={`M${X0} ${TOP + 26 + (i + 1) * FLOOR}H${X1}`}
          stroke="#E7EEF3"
          strokeOpacity="0.28"
          strokeWidth="0.8"
          className="animate-[fade-up_600ms_var(--ease-precise)_both]"
          style={{ animationDelay: `${1100 + i * 50}ms` }}
        />
      ))}
      {/* windows */}
      <g className="animate-[fade-up_900ms_var(--ease-precise)_both]" style={{ animationDelay: "1500ms" }}>
        {Array.from({ length: COLS }, (_, c) =>
          Array.from({ length: FLOORS }, (_, f) =>
            [0.18, 0.6].map((p) => (
              <rect
                key={`${c}-${f}-${p}`}
                x={X0 + c * COLW + p * COLW}
                y={TOP + 26 + f * FLOOR + 9}
                width={COLW * 0.22}
                height={FLOOR * 0.48}
                fill="none"
                stroke="#E7EEF3"
                strokeOpacity="0.35"
                strokeWidth="0.7"
              />
            )),
          ),
        )}
      </g>

      {/* ground line + hatch + basement */}
      <path d={`M60 ${GROUND}H540`} stroke="#E7EEF3" strokeWidth="1.4" className="draw-path" style={{ ["--len" as string]: 520 }} />
      {Array.from({ length: 60 }, (_, i) => (
        <path key={i} d={`M${60 + i * 8} ${GROUND + 6}l6 -6`} stroke="#E7EEF3" strokeOpacity="0.25" strokeWidth="0.6" />
      ))}
      <rect x={X0} y={GROUND} width={X1 - X0} height="40" fill="none" stroke="#E7EEF3" strokeOpacity="0.5" strokeDasharray="5 4" />

      {/* dimension line: height */}
      <g fontFamily="var(--font-mono)" fontSize="10" fill="#7FA3B8" className="animate-[fade-up_700ms_var(--ease-precise)_both]" style={{ animationDelay: "1800ms" }}>
        <path d={`M72 ${TOP}V${GROUND}M66 ${TOP}h12M66 ${GROUND}h12`} stroke="#7FA3B8" strokeWidth="0.8" />
        <text x="62" y={(TOP + GROUND) / 2} transform={`rotate(-90 62 ${(TOP + GROUND) / 2})`} textAnchor="middle">
          9 ЭТ. · ВЫСОТА ПО ПАСПОРТУ
        </text>
        {Array.from({ length: FLOORS }, (_, f) => (
          <text key={f} x={X1 + 14} y={GROUND - f * FLOOR - FLOOR / 2 + 4} fontSize="9" fill="#5E7F93">
            {f + 1}
          </text>
        ))}
      </g>

      {/* inspection callouts with leader lines */}
      {CALLOUTS.map((c, i) => (
        <g key={c.code} className="animate-[fade-up_700ms_var(--ease-precise)_both]" style={{ animationDelay: `${2200 + i * 260}ms` }}>
          <path d={`M${c.x} ${c.y}L${c.lx} ${c.ly}`} stroke={c.color} strokeWidth="0.9" />
          <circle cx={c.x} cy={c.y} r="12" fill="none" stroke={c.color} strokeOpacity="0.5" />
          <circle cx={c.x} cy={c.y} r="5.5" fill={c.color} />
          <g fontFamily="var(--font-mono)" textAnchor={c.anchor}>
            <text x={c.lx} y={c.ly - 16} fontSize="10" fill={c.color} letterSpacing="0.06em">
              {c.code} · {c.risk}
            </text>
            <text x={c.lx} y={c.ly - 3} fontSize="12.5" fill="#E7EEF3" fontFamily="var(--font-sans)">
              {c.text}
            </text>
          </g>
        </g>
      ))}

      {/* sheet stamp */}
      <g fontFamily="var(--font-mono)" fontSize="9" className="animate-[fade-up_700ms_var(--ease-precise)_both]" style={{ animationDelay: "2900ms" }}>
        <rect x="520" y="500" width="190" height="44" fill="#101D2C" stroke="#E7EEF3" strokeOpacity="0.25" />
        <path d="M520 522H710M600 500V544" stroke="#E7EEF3" strokeOpacity="0.25" />
        <text x="528" y="515" fill="#7FA3B8">ЛИСТ</text>
        <text x="608" y="515" fill="#E7EEF3">ФАСАД 1–4</text>
        <text x="528" y="537" fill="#7FA3B8">СХЕМА</text>
        <text x="608" y="537" fill="#E7EEF3">НЕ В МАСШТАБЕ</text>
      </g>
    </svg>
  );
}
