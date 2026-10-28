import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Split entry frame: brand panel on the left, the form on the right. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-line bg-base-2 text-ink lg:flex lg:flex-col">
        <div className="relative flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Link href="/" aria-label="Tirek — главная">
            <Logo />
          </Link>
          <svg viewBox="0 0 360 240" className="w-full max-w-md" aria-hidden>
            <g fill="none" stroke="var(--color-ink)" strokeOpacity="0.8" strokeWidth="1.1">
              <path className="draw-path" style={{ ["--len" as string]: 1100 }} d="M40 210V60H320V210M30 60H330M40 60V40H320V60" />
            </g>
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={`M40 ${60 + (i + 1) * 25}H320`} stroke="var(--color-steel)" strokeOpacity=".2" strokeWidth=".8" />
            ))}
            {[110, 180, 250].map((x) => (
              <path key={x} d={`M${x} 28V222`} stroke="var(--color-steel-2)" strokeWidth=".8" strokeDasharray="8 3 2 3" />
            ))}
            <path d="M10 210H350" stroke="var(--color-ink)" strokeOpacity=".6" strokeWidth="1" />
            <circle cx="215" cy="122" r="4.5" fill="var(--color-accent)" />
            <circle cx="215" cy="122" r="10" fill="none" stroke="var(--color-accent)" strokeOpacity=".35" />
            <path d="M215 122L300 20" stroke="var(--color-accent)" strokeOpacity=".7" strokeWidth=".8" />
            <text x="356" y="14" textAnchor="end" fill="var(--color-muted)" fontSize="9" fontFamily="var(--font-mono)">ТОЧКА ОСМОТРА</text>
          </svg>
          <div>
            <p className="max-w-md font-display text-[28px] leading-snug font-semibold tracking-[-0.02em]">
              «Мы не заменяем ОСИ. Мы становимся его <span className="text-accent">техническим партнёром</span>».
            </p>
            <p className="mt-4 font-mono text-[11px] tracking-[0.1em] text-faint uppercase">Инженерная точность · Ясность процессов · Доверие к данным</p>
          </div>
        </div>
      </aside>
      <main className="relative flex items-center justify-center bg-canvas px-5 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
