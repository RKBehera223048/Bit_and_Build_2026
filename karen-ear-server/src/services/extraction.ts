// ============================================================
// AI Extraction Pipeline — Orchestrates all extraction methods
// ============================================================

import type { Extraction } from "../types";
import { extractFromReport } from "../ai/ruleBasedNLP";
import { extractWithGroq } from "../ai/groqClient";

export async function processExtraction(rawText: string): Promise<Extraction> {
  // Try Groq (optional cloud LLM) first
  if (process.env.GROQ_API_KEY) {
    try {
      const groqResult = await extractWithGroq(rawText);
      if (groqResult) {
        console.log("[Extraction] Used Groq Llama for extraction");
        return groqResult;
      }
    } catch (err) {
      console.warn("[Extraction] Groq failed, falling back to rule-based:", err);
    }
  }

  // Fallback: Rule-based NLP (always available)
  console.log("[Extraction] Using rule-based NLP extraction");
  return extractFromReport(rawText);
}
