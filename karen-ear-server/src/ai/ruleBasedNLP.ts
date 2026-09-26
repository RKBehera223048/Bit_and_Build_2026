// ============================================================
// Rule-Based NLP Extraction — Guaranteed Fallback
// Extracts structured incident data using regex + keyword matching
// ============================================================

import type { Extraction, IncidentType, TriageCategory } from "../types";
import landmarksData from "../data/nyc-landmarks.json";

// --- Incident Type Detection ---
const INCIDENT_PATTERNS: Record<IncidentType, RegExp[]> = {
  fire: [/\bfire\b/i, /\bflames?\b/i, /\bburn(ing|s|ed)?\b/i, /\bsmoke\b/i, /\bblaze\b/i, /\barson\b/i],
  medical: [/\bheart attack\b/i, /\bnot breathing\b/i, /\bcollapsed\b/i, /\bfaint(ed)?\b/i, /\bseizure\b/i, /\bcpr\b/i, /\bparamedic/i, /\bems\b/i, /\bunconscious\b/i, /\bbleeding\b/i, /\bstroke\b/i],
  collapse: [/\bcollaps(e|ed|ing)\b/i, /\bscaffolding\b.*\b(down|fell|collapse)/i, /\bbuilding.*\b(down|fell)/i, /\bdebris\b/i],
  trapped: [/\btrapped\b/i, /\bstuck\b/i, /\bpinned\b/i, /\bcant get out\b/i, /\bcan't get out\b/i, /\bpeople.*inside\b/i, /\bstorm drain\b/i],
  violence: [/\bshot(s)? fired\b/i, /\bshooting\b/i, /\bstabb(ed|ing)\b/i, /\brobb(ery|ing|ed)\b/i, /\barmed\b/i, /\bgun\b/i, /\bassault\b/i, /\bweapon\b/i],
  hazard: [/\bgas leak\b/i, /\bchemical\b/i, /\btoxic\b/i, /\bexplosion\b/i, /\bbomb\b/i, /\bpower line\b/i, /\belectr(ic|ical)\b/i],
  creature: [/\bvillain\b/i, /\bmonster\b/i, /\bcreature\b/i, /\bmutant\b/i, /\bsuper\s?villain\b/i, /\bweird\b.*\bcostume\b/i, /\bunderground\b.*\bmoving\b/i],
  suspicious: [/\bsuspicious\b/i, /\bpackage\b/i, /\bunattended\b/i, /\bstrange\b/i, /\bweird noise\b/i, /\bstole\b/i, /\btheft\b/i],
  other: [],
};

// --- Hazard Keywords ---
const HAZARD_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "fire spreading", pattern: /\b(spread|spreading)\b/i },
  { label: "structural collapse risk", pattern: /\b(collapse|debris|scaffolding)\b/i },
  { label: "people trapped", pattern: /\b(trapped|stuck|pinned|inside)\b/i },
  { label: "active gunfire", pattern: /\b(shot|shooting|gun|armed)\b/i },
  { label: "gas leak", pattern: /\b(gas leak|gas smell)\b/i },
  { label: "chemical exposure", pattern: /\b(chemical|toxic)\b/i },
  { label: "rising water", pattern: /\b(water.*rising|flood)\b/i },
  { label: "explosion risk", pattern: /\b(explosion|bomb|explosive)\b/i },
  { label: "heavy smoke", pattern: /\b(smoke|fumes)\b/i },
];

// --- People at Risk Extraction ---
function extractPeopleAtRisk(text: string): number | null {
  // Look for explicit numbers
  const patterns = [
    /(\d+)\s*(?:people|person|worker|victim|injured|trapped|hurt)/i,
    /at least\s+(\d+)/i,
    /(?:people|person|everyone)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  // Check for implied people
  if (/people\b|person\b|someone\b|crowd\b|everyone\b/i.test(text)) return 1;
  if (/\bstill inside\b|\btrapped\b/i.test(text)) return 1;

  return null;
}

// --- Location Extraction ---
function extractLocation(text: string): { locationText: string | null; landmark: string | null; lat: number | null; lng: number | null } {
  const lowerText = text.toLowerCase();

  for (const lm of landmarksData.landmarks) {
    // Check exact name
    if (lowerText.includes(lm.name.toLowerCase())) {
      return { locationText: lm.name, landmark: lm.name, lat: lm.lat, lng: lm.lng };
    }
    // Check aliases
    for (const alias of lm.aliases) {
      if (lowerText.includes(alias.toLowerCase())) {
        return { locationText: alias, landmark: lm.name, lat: lm.lat, lng: lm.lng };
      }
    }
  }

  // Try to extract generic location text (near, at, on)
  const locMatch = text.match(/(?:near|at|on|by|around)\s+([A-Z][a-zA-Z\s&]+?)(?:\.|,|!|\?|$)/);
  if (locMatch) {
    return { locationText: locMatch[1].trim(), landmark: null, lat: null, lng: null };
  }

  return { locationText: null, landmark: null, lat: null, lng: null };
}

// --- Triage Category Assignment ---
function assignTriageCategory(
  incidentType: IncidentType,
  peopleAtRisk: number | null,
  hazards: string[],
  text: string
): TriageCategory {
  // CAT1 PURPLE: Immediate life-saving
  const cat1Triggers = [
    /trapped/i, /not breathing/i, /still inside/i, /shots fired/i,
    /shooting/i, /explosion/i, /collapse.*people/i, /child.*stuck/i,
    /water.*rising/i,
  ];
  if (cat1Triggers.some((p) => p.test(text))) return "CAT1_PURPLE";
  if (incidentType === "trapped") return "CAT1_PURPLE";
  if (incidentType === "violence" && /armed|gun|shot/i.test(text)) return "CAT1_PURPLE";
  if (incidentType === "collapse" && (peopleAtRisk ?? 0) > 0) return "CAT1_PURPLE";

  // CAT2 RED: Emergency response
  const cat2Triggers = [
    /heart attack/i, /not breathing/i, /stroke/i, /unconscious/i,
    /major\s*burn/i, /fire/i, /blaze/i, /flames/i, /gas leak/i,
    /bleeding.*head/i,
  ];
  if (cat2Triggers.some((p) => p.test(text))) return "CAT2_RED";
  if (incidentType === "fire") return "CAT2_RED";
  if (incidentType === "medical" && (peopleAtRisk ?? 0) > 0) return "CAT2_RED";
  if (incidentType === "hazard") return "CAT2_RED";

  // CAT3 YELLOW: Urgent
  if (incidentType === "medical") return "CAT3_YELLOW";
  if (incidentType === "creature") return "CAT3_YELLOW";
  if (incidentType === "violence") return "CAT3_YELLOW";
  if (hazards.length > 0) return "CAT3_YELLOW";

  // CAT4 GREEN: Less urgent
  return "CAT4_GREEN";
}

// --- Confidence Estimation ---
function estimateConfidence(
  incidentType: IncidentType,
  location: { landmark: string | null },
  peopleAtRisk: number | null,
  text: string
): number {
  let confidence = 0.5;

  // Has specific incident type (not "other")
  if (incidentType !== "other") confidence += 0.15;

  // Has resolved landmark
  if (location.landmark) confidence += 0.15;

  // Has people count
  if (peopleAtRisk !== null) confidence += 0.1;

  // Longer, more detailed report
  if (text.length > 100) confidence += 0.05;
  if (text.length > 200) confidence += 0.05;

  return Math.min(confidence, 1.0);
}

// --- Generate Summary ---
function generateSummary(
  incidentType: IncidentType,
  location: { locationText: string | null; landmark: string | null },
  peopleAtRisk: number | null,
  hazards: string[],
  text: string
): string {
  const typeLabels: Record<IncidentType, string> = {
    fire: "Structure fire",
    medical: "Medical emergency",
    collapse: "Structural collapse",
    trapped: "People trapped",
    violence: "Violent incident",
    hazard: "Environmental hazard",
    creature: "Unusual threat",
    suspicious: "Suspicious activity",
    other: "Reported incident",
  };

  let summary = typeLabels[incidentType];

  if (location.landmark) {
    summary += ` at ${location.landmark}`;
  } else if (location.locationText) {
    summary += ` near ${location.locationText}`;
  }

  if (peopleAtRisk !== null && peopleAtRisk > 0) {
    summary += `, ${peopleAtRisk} ${peopleAtRisk === 1 ? "person" : "people"} at risk`;
  }

  if (hazards.length > 0) {
    summary += `. Hazards: ${hazards.slice(0, 3).join(", ")}`;
  }

  return summary;
}

// ============================================================
// Main Extraction Function
// ============================================================
export function extractFromReport(rawText: string): Extraction {
  // 1. Detect incident type
  let incidentType: IncidentType = "other";
  let bestMatchCount = 0;

  for (const [type, patterns] of Object.entries(INCIDENT_PATTERNS)) {
    const matchCount = patterns.filter((p) => p.test(rawText)).length;
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      incidentType = type as IncidentType;
    }
  }

  // 2. Extract location
  const location = extractLocation(rawText);

  // 3. Extract people at risk
  const peopleAtRisk = extractPeopleAtRisk(rawText);

  // 4. Detect hazards
  const hazards = HAZARD_PATTERNS
    .filter((h) => h.pattern.test(rawText))
    .map((h) => h.label);

  // 5. Assign triage category
  const triageCategory = assignTriageCategory(incidentType, peopleAtRisk, hazards, rawText);

  // 6. Estimate confidence
  const confidence = estimateConfidence(incidentType, location, peopleAtRisk, rawText);

  // 7. Generate summary
  const summary = generateSummary(incidentType, location, peopleAtRisk, hazards, rawText);

  // 8. Determine if clarification needed
  const needsClarification = !location.landmark && incidentType !== "other";

  return {
    incidentType,
    summary,
    locationText: location.locationText,
    landmark: location.landmark,
    peopleAtRisk,
    triageCategory,
    hazards,
    confidence,
    needsClarification,
    extractionMethod: "rule-based",
  };
}
