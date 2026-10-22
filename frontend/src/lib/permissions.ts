/**
 * UI-only permission hints: hide or disable controls the user cannot use.
 * Real enforcement is on the server (ТЗ 8.2, 11.6) — never rely on this for security.
 */
import type { Me, Role } from "./api/types";

export function roles(me: Me | undefined): Set<Role> {
  return new Set(me?.memberships.map((m) => m.role) ?? []);
}

const has = (me: Me | undefined, ...rs: Role[]) => rs.some((r) => roles(me).has(r));

export const isCustomerOnly = (me?: Me) =>
  !!me && me.memberships.length > 0 && me.memberships.every((m) => m.organization_type === "customer");

/** Residents only: their own cabinet, never engineering screens. */
export const isResidentOnly = (me?: Me) =>
  !!me && me.memberships.length > 0 && me.memberships.every((m) => m.role === "resident");

export const can = {
  manageOrganizations: (me?: Me) => has(me, "provider_admin"),
  editBuilding: (me?: Me) => has(me, "provider_admin", "reviewing_engineer"),
  planInspection: (me?: Me) => has(me, "provider_admin", "reviewing_engineer"),
  inspect: (me?: Me) => has(me, "field_specialist", "reviewing_engineer", "provider_admin"),
  review: (me?: Me) => has(me, "reviewing_engineer"),
  agreeWork: (me?: Me) => has(me, "osi_representative"),
  planProduction: (me?: Me) => has(me, "production_planner", "reviewing_engineer", "provider_admin"),
  dispatch: (me?: Me) => has(me, "dispatcher", "provider_admin"),
  seeAnalytics: (me?: Me) => has(me, "reviewing_engineer", "provider_admin", "production_planner"),
};

/** Start page after login, by the main role. */
export function homeFor(me?: Me): string {
  if (isResidentOnly(me)) return "/resident";
  if (isCustomerOnly(me)) return "/osi";
  if (has(me, "reviewing_engineer", "provider_admin")) return "/dashboard";
  if (has(me, "dispatcher")) return "/requests";
  if (has(me, "production_planner")) return "/work-orders";
  if (has(me, "field_specialist")) return "/inspections";
  return "/dashboard";
}
