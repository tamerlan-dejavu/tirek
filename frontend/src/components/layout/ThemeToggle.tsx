"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useTheme, type ThemeChoice } from "@/lib/theme";

/** Top bar: one tap switches light ↔ graphite. */
export function ThemeToggle() {
  const { resolved, set } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => set(next)}
      aria-label={next === "light" ? "Светлая тема" : "Тёмная тема"}
      title={next === "light" ? "Светлая тема" : "Тёмная тема"}
      className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-mist hover:text-ink"
    >
      {resolved === "dark" ? <Sun className="size-[18px]" strokeWidth={1.8} /> : <Moon className="size-[18px]" strokeWidth={1.8} />}
    </button>
  );
}

const OPTIONS: [ThemeChoice, string, typeof Sun][] = [
  ["light", "Светлая", Sun],
  ["dark", "Тёмная", Moon],
  ["system", "Как в системе", Monitor],
];

/** Settings: explicit choice, including following the operating system. */
export function ThemeCard() {
  const { choice, set } = useTheme();
  return (
    <Card title="Оформление">
      <div role="radiogroup" aria-label="Тема интерфейса" className="grid grid-cols-3 gap-2">
        {OPTIONS.map(([value, label, Icon]) => (
          <button
            key={value}
            role="radio"
            aria-checked={choice === value}
            onClick={() => set(value)}
            className={
              choice === value
                ? "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-accent bg-accent-soft text-sm text-ink"
                : "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border border-line text-sm text-muted hover:border-line-strong hover:text-ink"
            }
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Выбор хранится в этом браузере и действует на всём сайте.</p>
    </Card>
  );
}
