// ============================================================
// Karen's Ear — Shared Type Definitions
// ============================================================

// === Triage Category System ===
export type TriageCategory = "CAT1_PURPLE" | "CAT2_RED" | "CAT3_YELLOW" | "CAT4_GREEN";

export const TRIAGE_COLORS: Record<TriageCategory, string> = {
  CAT1_PURPLE: "#7B2D8E",
  CAT2_RED: "#E23636",
  CAT3_YELLOW: "#F5A623",
  CAT4_GREEN: "#27AE60",
};

export const TRIAGE_LABELS: Record<TriageCategory, string> = {
  CAT1_PURPLE: "Immediate Life-Saving",
  CAT2_RED: "Emergency Response",
  CAT3_YELLOW: "Urgent",
  CAT4_GREEN: "Less Urgent",
};

// === Incident Types ===
export type IncidentType =
  | "fire"
  | "medical"
  | "collapse"
  | "trapped"
  | "violence"
  | "hazard"
  | "creature"
  | "suspicious"
  | "other";

// === Report Source ===
export type ReportSource = "CALL" | "SMS" | "SOCIAL";

// === Report Status ===
export type ReportStatus = "new" | "processed" | "flagged" | "invalid";

// === Report (raw incoming message) ===
export interface Report {
  id: string;
  receivedAt: string;
  source: ReportSource;
  rawText: string;
  status: ReportStatus;
}

// === Extraction Method ===
export type ExtractionMethod = "jev-omni" | "groq-llama" | "rule-based";

// === Extraction (AI-generated structured data from a report) ===
export interface Extraction {
  incidentType: IncidentType;
  summary: string;
  locationText: string | null;
  landmark: string | null;
  peopleAtRisk: number | null;
  triageCategory: TriageCategory;
  hazards: string[];
  confidence: number; // 0-1
  needsClarification: boolean;
  extractionMethod: ExtractionMethod;
}

// === Incident Status ===
export type IncidentStatus = "active" | "dispatched" | "resolved";

// === Incident (correlated, scored, actionable) ===
export interface Incident {
  id: string;
  latitude: number | null;
  longitude: number | null;
  reportIds: string[];
  extraction: Extraction;
  priority: number; // 0-100
  triageCategory: TriageCategory;
  priorityReasons: string[];
  corroborationCount: number;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

// === Audit Action ===
export type AuditAction =
  | "created"
  | "merged"
  | "escalated"
  | "overridden"
  | "resolved"
  | "invalidated";

// === Audit Entry ===
export interface AuditEntry {
  id: string;
  incidentId: string;
  action: AuditAction;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  timestamp: string;
  actor: "system" | "dispatcher";
}

// === SSE Event Types ===
export type SSEEventType =
  | "report:new"
  | "report:updated"
  | "incident:new"
  | "incident:updated"
  | "incident:merged"
  | "audit:new";

export interface SSEEvent {
  type: SSEEventType;
  data: Report | Incident | AuditEntry;
  timestamp: string;
}

// === API Response Wrappers ===
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// === Dashboard Stats ===
export interface DashboardStats {
  totalReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
  reportsPerMinute: number;
  lastProcessedAt: string | null;
  systemStatus: "online" | "degraded" | "offline";
}
