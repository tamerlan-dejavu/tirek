"use client";

import { useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave for checklist answers (ТЗ 11.7: visible save indication).
 * Every save goes to the server — the draft can be continued from another device.
 */
export function useAutosave<T>(value: T, save: (v: T) => Promise<unknown>, delay = 800) {
  const [state, setState] = useState<SaveState>("idle");
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(() => {
      saveRef
        .current(value)
        .then(() => setState("saved"))
        .catch(() => setState("error"));
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return state;
}
