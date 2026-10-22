/**
 * Semantic vocabulary of the UI.
 *
 * Two independent axes are never mixed:
 *  - SEVERITY (expert risk category R1–R4) — "how dangerous";
 *  - STATUS (workflow position) — "where it is in the process".
 * A critical defect can be "В работе"; both are always shown, each in its own visual form.
 * Color is always duplicated by text and shape (ТЗ 11.6, WCAG 1.4.1).
 */
import type { DefectStatus, InspectionStatus, RiskCategory, WorkOrderStatus } from "./api/types";

export type Tone = "critical" | "warning" | "healthy" | "info" | "neutral" | "accent";

export const RISK: Record<RiskCategory, { label: string; short: string; level: 1 | 2 | 3 | 4; action: string }> = {
  R1: { label: "R1 · критический", short: "Критический", level: 4, action: "Требуется немедленная реакция" },
  R2: { label: "R2 · высокий", short: "Высокий", level: 3, action: "Первоочередное включение в план работ" },
  R3: { label: "R3 · средний", short: "Средний", level: 2, action: "Плановое устранение" },
  R4: { label: "R4 · низкий", short: "Низкий", level: 1, action: "Наблюдение и профилактический контроль" },
};
export const RISK_ORDER: RiskCategory[] = ["R1", "R2", "R3", "R4"];

interface StatusMeta {
  label: string;
  tone: Tone;
}

export const INSPECTION_STATUS: Record<InspectionStatus, StatusMeta> = {
  draft: { label: "Черновик", tone: "neutral" },
  submitted: { label: "На проверке", tone: "info" },
  returned: { label: "На доработке", tone: "warning" },
  approved: { label: "Утверждено", tone: "healthy" },
  cancelled: { label: "Отменено", tone: "neutral" },
};

export const DEFECT_STATUS: Record<DefectStatus, StatusMeta> = {
  detected: { label: "Обнаружен", tone: "neutral" },
  in_review: { label: "На проверке", tone: "info" },
  needs_clarification: { label: "Требует уточнения", tone: "warning" },
  confirmed: { label: "Подтверждён", tone: "accent" },
  planned: { label: "Запланирован", tone: "accent" },
  fixing: { label: "Устраняется", tone: "info" },
  fix_review: { label: "Проверка устранения", tone: "info" },
  closed: { label: "Закрыт", tone: "healthy" },
  rejected: { label: "Отклонён", tone: "neutral" },
};

/** Defect lifecycle main line, used by the lifecycle stepper. */
export const DEFECT_FLOW: DefectStatus[] = [
  "detected",
  "in_review",
  "confirmed",
  "planned",
  "fixing",
  "fix_review",
  "closed",
];

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, StatusMeta> = {
  proposed: { label: "Предложено", tone: "neutral" },
  agreed: { label: "Согласовано", tone: "accent" },
  scheduled: { label: "Запланировано", tone: "accent" },
  in_progress: { label: "В работе", tone: "info" },
  done: { label: "Выполнено", tone: "info" },
  verified: { label: "Проверено", tone: "healthy" },
  closed: { label: "Закрыто", tone: "healthy" },
  rejected: { label: "Отклонено", tone: "neutral" },
  postponed: { label: "Отложено", tone: "warning" },
  cancelled: { label: "Отменено", tone: "neutral" },
};

export const PRIORITY = {
  urgent: { label: "Срочно", tone: "critical" },
  high: { label: "Высокий", tone: "warning" },
  normal: { label: "Обычный", tone: "neutral" },
  low: { label: "Низкий", tone: "neutral" },
} as const satisfies Record<string, StatusMeta>;

export const ELEMENT_GROUP: Record<string, string> = {
  structural: "Конструкции",
  engineering: "Инженерные системы",
  operational: "Эксплуатационные",
  location: "Расположение",
};

export const OPEN_WORK: WorkOrderStatus[] = ["proposed", "agreed", "scheduled", "in_progress", "postponed"];

/** Spec §10 — mirrors backend workorders/models.py */
export const WORK_TYPE: Record<string, string> = {
  inspection: "Осмотр",
  maintenance: "Техническое обслуживание",
  cleaning: "Очистка, прочистка",
  testing: "Проверка, замеры",
  preparation: "Подготовка к сезону",
  sealing: "Герметизация",
  repair: "Ремонт",
  replacement: "Замена",
};
export const PERIODICITY: Record<string, string> = {
  once: "Разово",
  monthly: "Ежемесячно",
  quarterly: "Ежеквартально",
  semiannual: "2 раза в год",
  annual: "Ежегодно",
  "3y": "Раз в 3 года",
  "5y": "Раз в 5 лет",
};
export const WORK_KIND = { reactive: "Устранение дефекта", preventive: "Профилактика" } as const;
export const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** Value or «неизвестно» — the UI never invents technical data (ТЗ 5.3, 11.5). */
export function orUnknown(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === "") return "неизвестно";
  return unit ? `${value} ${unit}` : String(value);
}

const TZ = "Asia/Almaty";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(new Date(y, m - 1, 1)).replace(".", "");
}

/** Whole days from today to an ISO date (negative = in the past). */
export function daysFrom(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((new Date(iso.slice(0, 10)).getTime() - today.getTime()) / 86_400_000);
}

export function relativeDue(iso: string | null | undefined): string {
  const d = daysFrom(iso);
  if (d === null) return "срок не назначен";
  if (d === 0) return "сегодня";
  if (d < 0) return `просрочено на ${-d} дн.`;
  return `через ${d} дн.`;
}

/** Spec §11 — mirrors backend service_requests/models.py */
export const REQUEST_STATUS: Record<"new" | "accepted" | "assigned" | "in_progress" | "done" | "verified" | "closed" | "rejected", StatusMeta> = {
  new: { label: "Новая", tone: "warning" },
  accepted: { label: "Принята", tone: "accent" },
  assigned: { label: "Назначена", tone: "accent" },
  in_progress: { label: "Выполняется", tone: "info" },
  done: { label: "Выполнена", tone: "info" },
  verified: { label: "Проверена", tone: "healthy" },
  closed: { label: "Закрыта", tone: "healthy" },
  rejected: { label: "Отклонена", tone: "neutral" },
};
export const REQUEST_FLOW = ["new", "accepted", "assigned", "in_progress", "done", "verified", "closed"] as const;
export const OPEN_REQUEST = ["new", "accepted", "assigned", "in_progress", "done", "verified"];
export const REQUEST_PRIORITY: Record<"urgent" | "high" | "normal" | "low", StatusMeta> = {
  urgent: { label: "Аварийный", tone: "critical" },
  high: { label: "Высокий", tone: "warning" },
  normal: { label: "Обычный", tone: "neutral" },
  low: { label: "Низкий", tone: "neutral" },
};
export const REQUEST_PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

export const REQUEST_CATEGORIES: { value: string; label: string }[] = [
  { value: "leak", label: "Протечка, затопление" },
  { value: "heating", label: "Отопление" },
  { value: "water", label: "Водоснабжение" },
  { value: "sewerage", label: "Канализация" },
  { value: "electrical", label: "Электричество" },
  { value: "elevator", label: "Лифт" },
  { value: "roof", label: "Кровля, чердак" },
  { value: "facade", label: "Фасад, балконы" },
  { value: "common_areas", label: "Подъезд, общие помещения" },
  { value: "other", label: "Другое" },
];

/** "3 ч", "2 дн." — how long a request has been waiting. */
export function age(iso: string): string {
  const h = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return h < 24 ? `${h} ч` : `${Math.round(h / 24)} дн.`;
}

export const PRESENCE: Record<"present" | "absent" | "unknown", StatusMeta> = {
  present: { label: "Есть", tone: "healthy" },
  absent: { label: "Нет в доме", tone: "neutral" },
  unknown: { label: "Неизвестно", tone: "warning" },
};

export const STRUCTURAL_SCHEME: Record<string, string> = {
  unknown: "неизвестно",
  panel: "Панельная",
  brick: "Кирпичная",
  monolithic: "Монолитная",
  frame: "Каркасная",
  block: "Блочная",
  mixed: "Смешанная",
};

/** Urgency of elimination (engineering decision), shown next to — not instead of — danger R1–R4. */
export const DEFECT_PRIORITY: Record<"urgent" | "high" | "normal" | "low", StatusMeta> = {
  urgent: { label: "Срочно", tone: "critical" },
  high: { label: "Высокий", tone: "warning" },
  normal: { label: "Обычный", tone: "neutral" },
  low: { label: "Низкий", tone: "neutral" },
};
