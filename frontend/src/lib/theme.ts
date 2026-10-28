"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "tirek-theme";

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong theme.
 * Kept as a string: it must not wait for React. Default — graphite (dark).
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}")||"dark";var t=c==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):c;document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();`;

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

/** Theme preference of this browser (a per-viewer convenience, not account data). */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const c = read();
    setChoice(c);
    setResolved(resolve(c));
  }, []);

  // Follow the operating system while «Как в системе» is chosen
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const t = mq.matches ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t);
      setResolved(t);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const set = useCallback((c: ThemeChoice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // private mode: the choice lasts for this page only
    }
    const t = resolve(c);
    document.documentElement.setAttribute("data-theme", t);
    setChoice(c);
    setResolved(t);
  }, []);

  return { choice, resolved, set };
}
