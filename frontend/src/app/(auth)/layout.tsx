import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col">
        <div aria-hidden className="grid-blueprint absolute inset-0 opacity-70" />
        <div className="relative flex flex-1 flex-col justify-between p-12">
          <Link href="/" aria-label="Tirek — главная">
            <Logo />
          </Link>
          <svg viewBox="0 0 360 240" className="w-full max-w-md opacity-90" aria-hidden>
            <g fill="none" stroke="#E7EEF3" strokeWidth="1.2">
              <path className="draw-path" style={{ ["--len" as string]: 1100 }} d="M40 210V60H320V210M30 60H330M40 60V40H320V60" />
            </g>
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={`M40 ${60 + (i + 1) * 25}H320`} stroke="#E7EEF3" strokeOpacity=".22" strokeWidth=".8" />
            ))}
            {[110, 180, 250].map((x) => (
              <path key={x} d={`M${x} 28V222`} stroke="#20A6A6" strokeOpacity=".5" strokeWidth=".8" strokeDasharray="8 3 2 3" />
            ))}
            <path d="M10 210H350" stroke="#E7EEF3" strokeWidth="1.2" />
            <circle cx="215" cy="122" r="5" fill="#20A6A6" />
            <circle cx="215" cy="122" r="11" fill="none" stroke="#20A6A6" strokeOpacity=".5" />
            <path d="M215 122L300 20" stroke="#20A6A6" strokeWidth=".8" />
            <text x="304" y="18" fill="#9FD9D9" fontSize="9" fontFamily="var(--font-mono)">ТОЧКА ОСМОТРА</text>
          </svg>
          <div>
            <p className="max-w-md text-[26px] leading-snug font-medium tracking-[-0.015em]">
              «Мы не заменяем ОСИ. Мы становимся его <span className="text-teal">техническим партнёром</span>».
            </p>
            <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-white/45 uppercase">Инженерная точность · Ясность процессов · Доверие к данным</p>
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center bg-canvas px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo tone="dark" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
