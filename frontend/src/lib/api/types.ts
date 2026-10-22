/**
 * Hand-written domain types for the scaffold.
 * Replace with generated types (`npm run api:generate` → schema.d.ts) once the API settles.
 */

export type UUID = string;
export type RiskCategory = "R1" | "R2" | "R3" | "R4";
export type Role =
  | "provider_admin"
  | "field_specialist"
  | "reviewing_engineer"
  | "production_planner"
  | "dispatcher"
  | "osi_representative"
  | "resident";

export interface Membership {
  id: UUID;
  organization: UUID;
  organization_name: string;
  organization_type: "provider" | "customer";
  role: Role;
}

export interface Me {
  id: UUID;
  email: string;
  full_name: string;
  position: string;
  memberships: Membership[];
}

export interface Building {
  id: UUID;
  internal_code: string;
  name: string;
  address: string;
  city: string;
  year_built: number | null;
  floors: number | null;
  entrances: number | null;
  apartments: number | null;
  total_area_m2: string | null;
  structural_scheme: string;
  completeness: number;
  field_sources: Record<string, { source: string; recorded_at: string; by: UUID }>;
}

export interface BuildingElement {
  id: UUID;
  building: UUID;
  parent: UUID | null;
  element_type: string;
  name: string;
  location: string;
  path: string[];
}

export type InspectionStatus = "draft" | "submitted" | "returned" | "approved" | "cancelled";

export interface Inspection {
  id: UUID;
  number: string;
  building: UUID;
  building_address: string;
  status: InspectionStatus;
  assignee: UUID;
  assignee_name: string;
  template_version: UUID;
  planned_date: string | null;
  approved_at: string | null;
  is_published: boolean;
  version: number;
}

export type AnswerType = "compliance" | "number" | "text" | "date" | "photo" | "choice";

export interface ChecklistItem {
  id: UUID;
  element_type: string | null;
  code: string;
  text: string;
  guidance: string;
  answer_type: AnswerType;
  unit: string;
  choices: string[];
  is_required: boolean;
}

export interface InspectionAnswer {
  id: UUID;
  inspection: UUID;
  item: UUID;
  element: UUID | null;
  compliance: "" | "ok" | "fail" | "na";
  number_value: string | null;
  text_value: string;
  date_value: string | null;
  choice_value: string;
  comment: string;
  updated_at: string;
}

export type DefectStatus =
  | "detected"
  | "in_review"
  | "needs_clarification"
  | "confirmed"
  | "planned"
  | "fixing"
  | "fix_review"
  | "closed"
  | "rejected";

export interface Defect {
  id: UUID;
  number: string;
  building: UUID;
  building_address: string;
  element: UUID;
  element_path: string[];
  element_type: string;
  element_group: "structural" | "engineering" | "operational" | "location";
  category: string | null;
  category_name: string | null;
  priority: DefectPriority | "";
  inspection: UUID | null;
  inspection_number: string | null;
  author_name: string | null;
  location: string;
  defect_type: string;
  description: string;
  detected_on: string;
  preliminary_severity: RiskCategory | "";
  approved_risk: RiskCategory | null;
  status: DefectStatus;
  recommendations: string;
  closure_basis: string;
  created_at: string;
  updated_at: string;
}

export type WorkOrderStatus =
  | "proposed"
  | "agreed"
  | "scheduled"
  | "in_progress"
  | "done"
  | "verified"
  | "closed"
  | "rejected"
  | "postponed"
  | "cancelled";

export interface WorkOrder {
  id: UUID;
  number: string;
  building: UUID;
  building_address: string;
  defect: UUID | null;
  defect_number: string | null;
  risk_category: RiskCategory | null;
  title: string;
  kind: "reactive" | "preventive";
  work_type: string;
  periodicity: string;
  basis: string;
  element_name: string | null;
  responsible_display: string | null;
  materials: string;
  labor_hours: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  recommended_date: string | null;
  planned_date: string | null;
  status: WorkOrderStatus;
  status_reason: string;
  responsible_name: string;
  description: string;
  author_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PortalSummary {
  open_defects: number;
  open_defects_by_risk: Record<RiskCategory, number>;
  active_work_orders: number;
  awaiting_decision: number;
  overdue_work_orders: number;
  last_inspection: { id: string; number: string; approved_at: string } | null;
}

export interface Dashboard {
  buildings: number;
  inspections_total: number;
  inspections_awaiting_review: number;
  inspections_scheduled: number;
  defects_open: number;
  defects_r1: number;
  defects_r2: number;
  defects_pending_verification: number;
  work_orders_due_soon: number;
  work_orders_overdue: number;
  work_orders_completed: number;
  generated_at: string;
}

export type DefectPriority = "urgent" | "high" | "normal" | "low";

export interface DefectCategory {
  code: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  open_defects: number;
}

export interface Breakdown {
  open_by_risk: Record<RiskCategory | "unassessed", number>;
  open_by_group: Record<string, number>;
  open_by_element_type: Record<string, number>;
  open_by_category: Record<string, number>;
  all_by_category: Record<string, number>;
  open_by_priority: Partial<Record<DefectPriority, number>>;
  by_status: Partial<Record<DefectStatus, number>>;
  work_orders_by_status: Partial<Record<WorkOrderStatus, number>>;
  monthly: { month: string; detected: number; closed: number }[];
}

export interface ActivityItem {
  id: UUID;
  kind: "defect" | "work_order";
  object_id: UUID;
  object_number: string;
  title: string;
  to_status: string;
  actor: string;
  comment: string;
  at: string;
}

export type RequestStatus = "new" | "accepted" | "in_progress" | "resolved" | "rejected";

export interface ServiceRequest {
  id: UUID;
  number: string;
  building: UUID;
  building_address: string;
  author: UUID | null;
  author_name: string | null;
  category: string;
  category_label: string;
  entrance: number | null;
  floor: number | null;
  apartment: string;
  place: string;
  description: string;
  contact_phone: string;
  is_emergency: boolean;
  emergency_confirmed_at: string | null;
  status: RequestStatus;
  assignee: UUID | null;
  assignee_name: string | null;
  due_date: string | null;
  resolution: string;
  defect: UUID | null;
  defect_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Poll {
  id: UUID;
  building: UUID;
  building_address: string;
  question: string;
  description: string;
  closes_at: string | null;
  options: { id: number; text: string; votes: number | null }[];
  my_vote: number | null;
  total_votes: number;
  created_at: string;
}

export interface DemoAccount {
  key: string;
  email: string;
  title: string;
  person: string;
  summary: string;
  abilities: string[];
  home: string;
  group: "residents" | "provider" | "customer";
}

export type Presence = "present" | "absent" | "unknown";

export interface PassportEntry {
  id: UUID;
  building: UUID;
  element_type: string;
  element_name: string;
  group: "structural" | "engineering" | "operational";
  presence: Presence;
  quantity: number | null;
  characteristics: string;
  source: string;
  updated_by_name: string | null;
  updated_at: string;
  elements_count: number;
  open_defects: number;
}
