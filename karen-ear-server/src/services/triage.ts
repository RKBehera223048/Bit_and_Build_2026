// ============================================================
// Deterministic Triage Scorer
// Produces a 0-100 priority score + human-readable reasons
// ============================================================

import type { Extraction, TriageCategory, IncidentType } from "../types";

interface TriageResult {
  priority: number;
  triageCategory: TriageCategory;
  reasons: string[];
}

// --- Life Safety Score ---
function lifeSafetyScore(triageCategory: TriageCategory, peopleAtRisk: number | null): number {
  const floors: Record<TriageCategory, number> = {
    CAT1_PURPLE: 90,
    CAT2_RED: 70,
    CAT3_YELLOW: 40,
    CAT4_GREEN: 15,
  };

  let score = floors[triageCategory];

  // Boost for confirmed people at risk
  if (peopleAtRisk !== null && peopleAtRisk > 0) {
    score = Math.min(100, score + Math.min(peopleAtRisk * 5, 10));
  }

  return score;
}

// --- Urgency Score ---
function urgencyScore(incidentType: IncidentType, hazards: string[]): number {
  const typeUrgency: Record<IncidentType, number> = {
    fire: 85,
    trapped: 95,
    collapse: 90,
    violence: 88,
    medical: 70,
    hazard: 65,
    creature: 60,
    suspicious: 30,
    other: 20,
  };

  let score = typeUrgency[incidentType];

  // Active hazards increase urgency
  if (hazards.length > 0) {
    score = Math.min(100, score + hazards.length * 5);
  }

  return score;
}

// --- Escalation Risk ---
function escalationRisk(hazards: string[], incidentType: IncidentType): number {
  const highEscalation = ["fire spreading", "gas leak", "explosion risk", "rising water", "structural collapse risk"];
  const escalatingTypes: IncidentType[] = ["fire", "hazard", "collapse"];

  let score = 20;

  for (const hazard of hazards) {
    if (highEscalation.includes(hazard)) score += 20;
    else score += 8;
  }

  if (escalatingTypes.includes(incidentType)) score += 15;

  return Math.min(100, score);
}

// --- Corroboration Score ---
function corroborationScore(independentReports: number): number {
  if (independentReports <= 1) return 20;
  if (independentReports === 2) return 55;
  if (independentReports === 3) return 75;
  return Math.min(100, 75 + (independentReports - 3) * 8);
}

// --- Generate Reasons ---
function generateReasons(
  extraction: Extraction,
  corroborationCount: number,
  scores: {
    life: number;
    urgency: number;
    escalation: number;
    corroboration: number;
    confidence: number;
  }
): string[] {
  const reasons: string[] = [];

  // Triage category reason
  const categoryLabels: Record<TriageCategory, string> = {
    CAT1_PURPLE: "Immediate life-saving intervention required",
    CAT2_RED: "Emergency response needed",
    CAT3_YELLOW: "Urgent attention required",
    CAT4_GREEN: "Routine triage assessment",
  };
  reasons.push(categoryLabels[extraction.triageCategory]);

  // People at risk
  if (extraction.peopleAtRisk !== null && extraction.peopleAtRisk > 0) {
    reasons.push(`${extraction.peopleAtRisk} ${extraction.peopleAtRisk === 1 ? "person" : "people"} at risk`);
  }

  // Hazards
  if (extraction.hazards.length > 0) {
    reasons.push(`Active hazards: ${extraction.hazards.join(", ")}`);
  }

  // Corroboration
  if (corroborationCount > 1) {
    reasons.push(`${corroborationCount} independent reports corroborate this incident`);
  }

  // Location status
  if (extraction.landmark) {
    reasons.push(`Location confirmed: ${extraction.landmark}`);
  } else if (extraction.needsClarification) {
    reasons.push("⚠ Location needs clarification");
  }

  // Confidence
  if (extraction.confidence < 0.5) {
    reasons.push("⚠ Low extraction confidence");
  }

  return reasons;
}

// ============================================================
// Main Triage Function
// ============================================================
export function calculatePriority(
  extraction: Extraction,
  corroborationCount: number = 1
): TriageResult {
  const life = lifeSafetyScore(extraction.triageCategory, extraction.peopleAtRisk);
  const urgency = urgencyScore(extraction.incidentType, extraction.hazards);
  const escalation = escalationRisk(extraction.hazards, extraction.incidentType);
  const corroboration = corroborationScore(corroborationCount);
  const confidence = extraction.confidence * 100;

  // Weighted priority formula
  const priority = Math.round(
    0.35 * life +
    0.25 * urgency +
    0.15 * escalation +
    0.15 * corroboration +
    0.10 * confidence
  );

  const scores = { life, urgency, escalation, corroboration, confidence };
  const reasons = generateReasons(extraction, corroborationCount, scores);

  return {
    priority: Math.min(100, Math.max(0, priority)),
    triageCategory: extraction.triageCategory,
    reasons,
  };
}
