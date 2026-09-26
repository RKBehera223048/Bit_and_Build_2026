// ============================================================
// Groq Client — Optional Cloud LLM for Structured Extraction
// ============================================================

import Groq from "groq-sdk";
import type { Extraction, IncidentType, TriageCategory } from "../types";

let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const EXTRACTION_PROMPT = `You are Karen's Ear, an AI emergency dispatch assistant. Extract structured incident data from the following report.

RULES:
- Extract ONLY facts stated or strongly implied in the report
- If location, victim count, or hazard is unknown, return null
- Do NOT invent names, addresses, or details not in the report
- Do NOT make dispatch decisions
- Classify exactly ONE incident type from the list

Return valid JSON with this exact schema:
{
  "incidentType": "fire" | "medical" | "collapse" | "trapped" | "violence" | "hazard" | "creature" | "suspicious" | "other",
  "summary": "one-sentence summary of what happened",
  "locationText": "raw location text from report or null",
  "landmark": "recognized NYC landmark name or null",
  "peopleAtRisk": number or null,
  "triageCategory": "CAT1_PURPLE" | "CAT2_RED" | "CAT3_YELLOW" | "CAT4_GREEN",
  "hazards": ["list of active hazards"],
  "confidence": 0.0 to 1.0,
  "needsClarification": boolean
}

Triage categories:
- CAT1_PURPLE: Immediate life-saving intervention (trapped, active fire with people, shooting, collapse with victims)
- CAT2_RED: Emergency response (heart attack, major burns, structure fire, gas leak)
- CAT3_YELLOW: Urgent (pain control, stable injuries, suspicious threats)
- CAT4_GREEN: Less urgent (noise complaints, minor theft, non-emergency)`;

const VALID_INCIDENT_TYPES: IncidentType[] = [
  "fire", "medical", "collapse", "trapped", "violence", "hazard", "creature", "suspicious", "other",
];

const VALID_CATEGORIES: TriageCategory[] = [
  "CAT1_PURPLE", "CAT2_RED", "CAT3_YELLOW", "CAT4_GREEN",
];

export async function extractWithGroq(rawText: string): Promise<Extraction | null> {
  const client = getGroqClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `REPORT: "${rawText}"` },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    // Validate required fields
    if (!VALID_INCIDENT_TYPES.includes(parsed.incidentType)) return null;
    if (!VALID_CATEGORIES.includes(parsed.triageCategory)) return null;
    if (typeof parsed.summary !== "string") return null;
    if (typeof parsed.confidence !== "number") return null;

    return {
      incidentType: parsed.incidentType,
      summary: parsed.summary,
      locationText: parsed.locationText ?? null,
      landmark: parsed.landmark ?? null,
      peopleAtRisk: typeof parsed.peopleAtRisk === "number" ? parsed.peopleAtRisk : null,
      triageCategory: parsed.triageCategory,
      hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      needsClarification: parsed.needsClarification === true,
      extractionMethod: "groq-llama",
    };
  } catch (err) {
    console.error("[Groq] Extraction failed:", err);
    return null;
  }
}
