import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 font-mono text-sm uppercase tracking-[0.3em] text-ink-muted">Tirek</div>
        {children}
      </div>
    </div>
  );
}
