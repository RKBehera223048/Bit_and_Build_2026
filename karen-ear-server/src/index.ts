// ============================================================
// Karen's Ear — Express Server Entry Point
// With in-memory fallback when MongoDB is not available
// ============================================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { sseManager } from "./routes/sse";
import { FeedSimulator } from "./services/feed";
import { processExtraction } from "./services/extraction";
import { calculatePriority } from "./services/triage";
import { findCorrelation } from "./services/correlation";
import landmarksData from "./data/nyc-landmarks.json";
import type { Report, Incident, AuditEntry } from "./types";

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --- In-Memory Store ---
const store = {
  reports: [] as Report[],
  incidents: [] as Incident[],
  auditLogs: [] as AuditEntry[],
};

// --- Middleware ---
app.use(cors({
  origin: [CLIENT_URL, "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// --- SSE Endpoint ---
app.get("/api/stream", (req, res) => {
  sseManager.addClient(res);
});

// --- POST /api/reports --- Ingest a new report ---
app.post("/api/reports", async (req, res) => {
  try {
    const { source, rawText } = req.body;

    if (!source || !rawText) {
      res.status(400).json({ success: false, error: "source and rawText are required" });
      return;
    }

    // 1. Create report
    const report: Report = {
      id: uuidv4(),
      receivedAt: new Date().toISOString(),
      source,
      rawText,
      status: "new",
    };
    store.reports.unshift(report);

    // Broadcast new report
    sseManager.broadcast("report:new", report);

    // 2. Extract structured data
    const extraction = await processExtraction(rawText);

    // Resolve coordinates from landmark
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (extraction.landmark) {
      const landmark = landmarksData.landmarks.find(
        (l) => l.name.toLowerCase() === extraction.landmark!.toLowerCase()
      );
      if (landmark) {
        latitude = landmark.lat;
        longitude = landmark.lng;
      }
    }

    // 3. Check for correlation with existing incidents
    const activeIncidents = store.incidents.filter((i) => i.status === "active");
    const correlation = findCorrelation(extraction, activeIncidents, rawText, report.receivedAt);

    if (correlation.shouldMerge && correlation.matchedIncidentId) {
      // --- Merge into existing incident ---
      const idx = store.incidents.findIndex((i) => i.id === correlation.matchedIncidentId);
      if (idx !== -1) {
        const existing = store.incidents[idx];
        existing.reportIds.push(report.id);
        existing.corroborationCount += 1;
        existing.updatedAt = new Date().toISOString();

        // Recalculate priority
        const newTriage = calculatePriority(existing.extraction, existing.corroborationCount);
        existing.priority = newTriage.priority;
        existing.triageCategory = newTriage.triageCategory;
        existing.priorityReasons = newTriage.reasons;

        // Audit entry
        const audit: AuditEntry = {
          id: uuidv4(),
          incidentId: existing.id,
          action: "merged",
          previousValue: { corroborationCount: existing.corroborationCount - 1 },
          newValue: { corroborationCount: existing.corroborationCount, mergeReason: correlation.mergeReason },
          reason: `Report merged: ${correlation.mergeReason}`,
          timestamp: new Date().toISOString(),
          actor: "system",
        };
        store.auditLogs.unshift(audit);

        // Update report status
        report.status = "processed";

        // Broadcast
        sseManager.broadcast("incident:merged", existing);
        sseManager.broadcast("report:updated", report);

        res.status(200).json({
          success: true,
          data: { report, action: "merged", incidentId: existing.id, mergeReason: correlation.mergeReason },
        });
        return;
      }
    }

    // --- Create new incident ---
    const triage = calculatePriority(extraction);
    const now = new Date().toISOString();

    const incident: Incident = {
      id: uuidv4(),
      latitude,
      longitude,
      reportIds: [report.id],
      extraction,
      priority: triage.priority,
      triageCategory: triage.triageCategory,
      priorityReasons: triage.reasons,
      corroborationCount: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    store.incidents.push(incident);

    // Audit entry
    const audit: AuditEntry = {
      id: uuidv4(),
      incidentId: incident.id,
      action: "created",
      previousValue: null,
      newValue: { incidentType: extraction.incidentType, triageCategory: triage.triageCategory },
      reason: `New incident: ${extraction.summary}`,
      timestamp: now,
      actor: "system",
    };
    store.auditLogs.unshift(audit);

    // Update report status
    report.status = "processed";

    // Broadcast
    sseManager.broadcast("incident:new", incident);
    sseManager.broadcast("report:updated", report);

    res.status(201).json({
      success: true,
      data: { report, action: "created", incident },
    });
  } catch (err) {
    console.error("[Reports] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- GET /api/reports ---
app.get("/api/reports", (_req, res) => {
  res.json({ success: true, data: store.reports.slice(0, 100) });
});

// --- GET /api/incidents ---
app.get("/api/incidents", (_req, res) => {
  const sorted = [...store.incidents].sort((a, b) => b.priority - a.priority);
  res.json({ success: true, data: sorted });
});

// --- GET /api/incidents/:id ---
app.get("/api/incidents/:id", (req, res) => {
  const incident = store.incidents.find((i) => i.id === req.params.id);
  if (!incident) {
    res.status(404).json({ success: false, error: "Incident not found" });
    return;
  }
  const auditTrail = store.auditLogs.filter((a) => a.incidentId === req.params.id);
  res.json({ success: true, data: { incident, auditTrail } });
});

// --- PATCH /api/incidents/:id/override ---
app.patch("/api/incidents/:id/override", (req, res) => {
  try {
    const { action, reason, newTriageCategory } = req.body;
    const incident = store.incidents.find((i) => i.id === req.params.id);

    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    if (!reason) {
      res.status(400).json({ success: false, error: "Reason is required" });
      return;
    }

    const previousState = {
      triageCategory: incident.triageCategory,
      priority: incident.priority,
      status: incident.status,
    };

    switch (action) {
      case "escalate": {
        const map: Record<string, string> = {
          CAT4_GREEN: "CAT3_YELLOW",
          CAT3_YELLOW: "CAT2_RED",
          CAT2_RED: "CAT1_PURPLE",
          CAT1_PURPLE: "CAT1_PURPLE",
        };
        incident.triageCategory = map[incident.triageCategory] as typeof incident.triageCategory;
        incident.extraction.triageCategory = incident.triageCategory;
        const t = calculatePriority(incident.extraction, incident.corroborationCount);
        incident.priority = t.priority;
        incident.priorityReasons = [...t.reasons, `⚡ Escalated by dispatcher: ${reason}`];
        break;
      }
      case "override-category": {
        if (newTriageCategory) {
          incident.triageCategory = newTriageCategory;
          incident.extraction.triageCategory = newTriageCategory;
          const t = calculatePriority(incident.extraction, incident.corroborationCount);
          incident.priority = t.priority;
          incident.priorityReasons = [...t.reasons, `🔄 Overridden: ${reason}`];
        }
        break;
      }
      case "resolve":
        incident.status = "resolved";
        incident.priorityReasons = [...incident.priorityReasons, `✅ Resolved: ${reason}`];
        break;
      case "dispatch":
        incident.status = "dispatched";
        incident.priorityReasons = [...incident.priorityReasons, `🚀 Dispatched: ${reason}`];
        break;
      case "invalidate":
        incident.status = "resolved";
        incident.priority = 0;
        incident.priorityReasons = [`❌ Invalidated: ${reason}`];
        break;
      default:
        res.status(400).json({ success: false, error: `Unknown action: ${action}` });
        return;
    }

    incident.updatedAt = new Date().toISOString();

    const audit: AuditEntry = {
      id: uuidv4(),
      incidentId: incident.id,
      action: action === "invalidate" ? "invalidated" : action === "resolve" ? "resolved" : "overridden",
      previousValue: previousState,
      newValue: { triageCategory: incident.triageCategory, priority: incident.priority, status: incident.status },
      reason,
      timestamp: new Date().toISOString(),
      actor: "dispatcher",
    };
    store.auditLogs.unshift(audit);

    sseManager.broadcast("incident:updated", incident);
    res.json({ success: true, data: incident });
  } catch (err) {
    console.error("[Override] Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- GET /api/incidents/:id/audit ---
app.get("/api/incidents/:id/audit", (req, res) => {
  const entries = store.auditLogs.filter((a) => a.incidentId === req.params.id);
  res.json({ success: true, data: entries });
});

// --- Dashboard Stats ---
app.get("/api/stats", (_req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const recentReports = store.reports.filter((r) => r.receivedAt >= fiveMinAgo).length;

  res.json({
    success: true,
    data: {
      totalReports: store.reports.length,
      activeIncidents: store.incidents.filter((i) => i.status === "active").length,
      resolvedIncidents: store.incidents.filter((i) => i.status === "resolved").length,
      reportsPerMinute: Math.round((recentReports / 5) * 10) / 10,
      lastProcessedAt: store.reports[0]?.receivedAt ?? null,
      systemStatus: "online",
    },
  });
});

// --- Feed Control ---
let feedSimulator: FeedSimulator | null = null;

app.post("/api/feed/start", (req, res) => {
  const intervalMs = req.body.intervalMs || 8000;

  if (feedSimulator) feedSimulator.stop();

  feedSimulator = new FeedSimulator(async (report) => {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      const result = await response.json();
      console.log(`[Feed] Report processed: ${result.data?.action || "unknown"}`);
    } catch (err) {
      console.error("[Feed] Error:", err);
    }
  }, intervalMs);

  feedSimulator.start();
  res.json({ success: true, message: "Feed started", intervalMs });
});

app.post("/api/feed/stop", (_req, res) => {
  if (feedSimulator) feedSimulator.stop();
  res.json({ success: true, message: "Feed stopped" });
});

app.post("/api/feed/reset", (_req, res) => {
  if (feedSimulator) feedSimulator.reset();
  store.reports = [];
  store.incidents = [];
  store.auditLogs = [];
  res.json({ success: true, message: "Feed reset, all data cleared" });
});

app.get("/api/feed/status", (_req, res) => {
  res.json({
    success: true,
    data: feedSimulator ? feedSimulator.getStatus() : { running: false, currentIndex: 0, totalReports: 0 },
  });
});

// --- Health Check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), mode: "in-memory" });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n🕷️  Karen's Ear Server running on http://localhost:${PORT}`);
  console.log(`📡 SSE stream at http://localhost:${PORT}/api/stream`);
  console.log(`🎯 API: POST /api/reports, GET /api/incidents`);
  console.log(`🎮 Feed: POST /api/feed/start, /stop, /reset`);
  console.log(`\n🔧 Mode: In-memory storage`);
  console.log(`   Groq API: ${process.env.GROQ_API_KEY ? "configured" : "not configured (rule-based fallback)"}`);
  console.log(`   Client URL: ${CLIENT_URL}\n`);
});
