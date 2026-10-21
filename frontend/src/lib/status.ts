/**
 * Labels and visual tokens for statuses and risk categories.
 * Color always carries meaning and is duplicated by text (ТЗ 11.6).
 */
import type { DefectStatus, InspectionStatus, RiskCategory, WorkOrderStatus } from "./api/types";

export const RISK: Record<RiskCategory, { label: string; tone: string }> = {
  R1: { label: "R1 · критический", tone: "risk-r1" },
  R2: { label: "R2 · высокий", tone: "risk-r2" },
  R3: { label: "R3 · средний", tone: "risk-r3" },
  R4: { label: "R4 · низкий", tone: "risk-r4" },
};

export const INSPECTION_STATUS: Record<InspectionStatus, string> = {
  draft: "Черновик",
  submitted: "На проверке",
  returned: "Возвращено на доработку",
  approved: "Утверждено",
  cancelled: "Отменено",
};

export const DEFECT_STATUS: Record<DefectStatus, string> = {
  detected: "Обнаружен",
  in_review: "На проверке",
  needs_clarification: "Требует уточнения",
  confirmed: "Подтверждён",
  planned: "Запланирован",
  fixing: "Устраняется",
  fix_review: "Проверка устранения",
  closed: "Закрыт",
  rejected: "Отклонён как ошибочный",
};

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, string> = {
  proposed: "Предложено",
  agreed: "Согласовано",
  scheduled: "Запланировано",
  in_progress: "В работе",
  done: "Выполнено",
  verified: "Проверено",
  closed: "Закрыто",
  rejected: "Отклонено",
  postponed: "Отложено",
  cancelled: "Отменено",
};

/** Value or «неизвестно» — the UI never invents technical data (ТЗ 5.3, 11.5). */
export function orUnknown(value: unknown): string {
  return value === null || value === undefined || value === "" ? "неизвестно" : String(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty" }).format(new Date(iso));
}
