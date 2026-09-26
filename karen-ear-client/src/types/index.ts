// ============================================================
// Karen's Ear — Client Types (mirrored from server)
// ============================================================

export type TriageCategory = "CAT1_PURPLE" | "CAT2_RED" | "CAT3_YELLOW" | "CAT4_GREEN";

export const TRIAGE_COLORS: Record<TriageCategory, string> = {
  CAT1_PURPLE: "#7B2D8E",
  CAT2_RED: "#E23636",
  CAT3_YELLOW: "#F5A623",
  CAT4_GREEN: "#27AE60",
};

export const TRIAGE_LABELS: Record<TriageCategory, string> = {
  CAT1_PURPLE: "CAT 1 — Immediate",
  CAT2_RED: "CAT 2 — Emergency",
  CAT3_YELLOW: "CAT 3 — Urgent",
  CAT4_GREEN: "CAT 4 — Less Urgent",
};

export const TRIAGE_ICONS: Record<TriageCategory, string> = {
  CAT1_PURPLE: "🟣",
  CAT2_RED: "🔴",
  CAT3_YELLOW: "🟡",
  CAT4_GREEN: "🟢",
};

export type IncidentType =
  | "fire" | "medical" | "collapse" | "trapped" | "violence"
  | "hazard" | "creature" | "suspicious" | "other";

export type ReportSource = "CALL" | "SMS" | "SOCIAL";
export type ReportStatus = "new" | "processed" | "flagged" | "invalid";
export type ExtractionMethod = "jev-omni" | "groq-llama" | "rule-based";
export type IncidentStatus = "active" | "dispatched" | "resolved";

export interface Report {
  id: string;
  receivedAt: string;
  source: ReportSource;
  rawText: string;
  status: ReportStatus;
}

export interface Extraction {
  incidentType: IncidentType;
  summary: string;
  locationText: string | null;
  landmark: string | null;
  peopleAtRisk: number | null;
  triageCategory: TriageCategory;
  hazards: string[];
  confidence: number;
  needsClarification: boolean;
  extractionMethod: ExtractionMethod;
}

export interface Incident {
  id: string;
  latitude: number | null;
  longitude: number | null;
  reportIds: string[];
  extraction: Extraction;
  priority: number;
  triageCategory: TriageCategory;
  priorityReasons: string[];
  corroborationCount: number;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  incidentId: string;
  action: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  timestamp: string;
  actor: "system" | "dispatcher";
}

export interface DashboardStats {
  totalReports: number;
  activeIncidents: number;
  resolvedIncidents: number;
  reportsPerMinute: number;
  lastProcessedAt: string | null;
  systemStatus: "online" | "degraded" | "offline";
}

export const SOURCE_ICONS: Record<ReportSource, string> = {
  CALL: "📞",
  SMS: "💬",
  SOCIAL: "🐦",
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  fire: "🔥 Fire",
  medical: "🏥 Medical",
  collapse: "🏚️ Collapse",
  trapped: "🆘 Trapped",
  violence: "⚔️ Violence",
  hazard: "☢️ Hazard",
  creature: "🦎 Creature",
  suspicious: "🔍 Suspicious",
  other: "📋 Other",
};
