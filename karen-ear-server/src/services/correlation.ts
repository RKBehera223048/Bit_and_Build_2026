// ============================================================
// Correlation Engine — Merges duplicate/related reports
// ============================================================

import type { Incident, Extraction } from "../types";

interface CorrelationResult {
  shouldMerge: boolean;
  matchedIncidentId: string | null;
  mergeReason: string | null;
}

// --- Compatible Incident Types ---
const COMPATIBLE_TYPES: Record<string, string[]> = {
  fire: ["fire", "trapped", "hazard"],
  trapped: ["fire", "trapped", "collapse"],
  collapse: ["collapse", "trapped"],
  medical: ["medical"],
  violence: ["violence"],
  hazard: ["hazard", "fire"],
  creature: ["creature", "suspicious"],
  suspicious: ["suspicious", "creature"],
  other: [],
};

// --- Haversine Distance (meters) ---
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Token Overlap Similarity ---
function tokenSimilarity(text1: string, text2: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );

  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let overlap = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) overlap++;
  }

  return (2 * overlap) / (tokens1.size + tokens2.size);
}

// ============================================================
// Main Correlation Function
// ============================================================
export function findCorrelation(
  extraction: Extraction,
  activeIncidents: Incident[],
  reportText: string,
  _reportTimestamp: string
): CorrelationResult {
  const TIME_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const PROXIMITY_THRESHOLD_M = 400; // 400 meters
  const now = Date.now();

  for (const incident of activeIncidents) {
    // 1. Check time window
    const incidentTime = new Date(incident.createdAt).getTime();
    if (now - incidentTime > TIME_WINDOW_MS) continue;

    // 2. Check compatible incident type
    const compatibleTypes = COMPATIBLE_TYPES[extraction.incidentType] || [];
    if (!compatibleTypes.includes(incident.extraction.incidentType)) continue;

    // 3. Check location proximity
    let locationMatch = false;
    let mergeReason = "";

    // Same landmark
    if (
      extraction.landmark &&
      incident.extraction.landmark &&
      extraction.landmark.toLowerCase() === incident.extraction.landmark.toLowerCase()
    ) {
      locationMatch = true;
      mergeReason = `Same landmark: ${extraction.landmark}`;
    }

    // Coordinate proximity
    if (
      !locationMatch &&
      extraction.landmark && incident.latitude && incident.longitude
    ) {
      // Get coordinates for the new extraction's landmark
      const landmarksData = require("../data/nyc-landmarks.json");
      const newLandmark = landmarksData.landmarks.find(
        (l: { name: string }) => l.name === extraction.landmark
      );
      if (newLandmark) {
        const distance = haversineDistance(
          newLandmark.lat, newLandmark.lng,
          incident.latitude, incident.longitude
        );
        if (distance <= PROXIMITY_THRESHOLD_M) {
          locationMatch = true;
          mergeReason = `Proximity match: ${Math.round(distance)}m apart`;
        }
      }
    }

    if (!locationMatch) continue;

    // 4. Check semantic similarity (lightweight token overlap)
    const similarity = tokenSimilarity(reportText, incident.extraction.summary);
    if (similarity < 0.15) continue;

    return {
      shouldMerge: true,
      matchedIncidentId: incident.id,
      mergeReason: mergeReason || `Related ${extraction.incidentType} report near same location`,
    };
  }

  return {
    shouldMerge: false,
    matchedIncidentId: null,
    mergeReason: null,
  };
}
