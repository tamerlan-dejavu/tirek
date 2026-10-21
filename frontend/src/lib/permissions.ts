/**
 * UI-only permission hints: hide or disable controls the user cannot use.
 * Real enforcement is on the server (ТЗ 8.2, 11.6) — never rely on this for security.
 */
import type { Me, Role } from "./api/types";

export function roles(me: Me | undefined): Set<Role> {
  return new Set(me?.memberships.map((m) => m.role) ?? []);
}

export const isCustomerOnly = (me?: Me) =>
  !!me && me.memberships.length > 0 && me.memberships.every((m) => m.organization_type === "customer");

export const can = {
  manageOrganizations: (me?: Me) => roles(me).has("provider_admin"),
  editBuilding: (me?: Me) => roles(me).has("provider_admin") || roles(me).has("reviewing_engineer"),
  planInspection: (me?: Me) => roles(me).has("provider_admin") || roles(me).has("reviewing_engineer"),
  review: (me?: Me) => roles(me).has("reviewing_engineer"),
  agreeWork: (me?: Me) => roles(me).has("osi_representative"),
};
