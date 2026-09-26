// ============================================================
// Incident Routes — GET incidents, PATCH override, resolve
// ============================================================

import { Router, Request, Response } from "express";
import { IncidentModel } from "../models/Incident";
import { AuditModel } from "../models/AuditLog";
import { calculatePriority } from "../services/triage";
import { sseManager } from "./sse";
import type { TriageCategory } from "../types";

const router = Router();

// --- GET /api/incidents — List all incidents sorted by priority ---
router.get("/", async (_req: Request, res: Response) => {
  try {
    const incidents = await IncidentModel.find()
      .sort({ priority: -1 })
      .limit(100);
    res.json({ success: true, data: incidents.map((i) => i.toJSON()) });
  } catch (err) {
    console.error("[Incidents] Error fetching:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- GET /api/incidents/:id — Get single incident with audit trail ---
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const incident = await IncidentModel.findById(req.params.id);
    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    const auditEntries = await AuditModel.find({ incidentId: req.params.id })
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: {
        incident: incident.toJSON(),
        auditTrail: auditEntries.map((a) => a.toJSON()),
      },
    });
  } catch (err) {
    console.error("[Incidents] Error fetching:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- PATCH /api/incidents/:id/override — Human override ---
router.patch("/:id/override", async (req: Request, res: Response) => {
  try {
    const { action, reason, newTriageCategory } = req.body;
    const incident = await IncidentModel.findById(req.params.id);

    if (!incident) {
      res.status(404).json({ success: false, error: "Incident not found" });
      return;
    }

    if (!reason) {
      res.status(400).json({ success: false, error: "Reason is required for overrides" });
      return;
    }

    const previousState = {
      triageCategory: incident.triageCategory,
      priority: incident.priority,
      status: incident.status,
    };

    switch (action) {
      case "escalate": {
        // Move to higher category
        const escalationMap: Record<TriageCategory, TriageCategory> = {
          CAT4_GREEN: "CAT3_YELLOW",
          CAT3_YELLOW: "CAT2_RED",
          CAT2_RED: "CAT1_PURPLE",
          CAT1_PURPLE: "CAT1_PURPLE",
        };
        incident.triageCategory = escalationMap[incident.triageCategory as TriageCategory];
        incident.extraction.triageCategory = incident.triageCategory;
        const newTriage = calculatePriority(incident.extraction, incident.corroborationCount);
        incident.priority = newTriage.priority;
        incident.priorityReasons = [...newTriage.reasons, `⚡ Escalated by dispatcher: ${reason}`];
        break;
      }

      case "override-category": {
        if (!newTriageCategory) {
          res.status(400).json({ success: false, error: "newTriageCategory required for override-category" });
          return;
        }
        incident.triageCategory = newTriageCategory;
        incident.extraction.triageCategory = newTriageCategory;
        const newTriage = calculatePriority(incident.extraction, incident.corroborationCount);
        incident.priority = newTriage.priority;
        incident.priorityReasons = [...newTriage.reasons, `🔄 Category overridden by dispatcher: ${reason}`];
        break;
      }

      case "resolve": {
        incident.status = "resolved";
        incident.priorityReasons = [...incident.priorityReasons, `✅ Resolved by dispatcher: ${reason}`];
        break;
      }

      case "dispatch": {
        incident.status = "dispatched";
        incident.priorityReasons = [...incident.priorityReasons, `🚀 Dispatched: ${reason}`];
        break;
      }

      case "invalidate": {
        incident.status = "resolved";
        incident.priority = 0;
        incident.priorityReasons = [`❌ Invalidated by dispatcher: ${reason}`];
        break;
      }

      default:
        res.status(400).json({ success: false, error: `Unknown action: ${action}` });
        return;
    }

    incident.updatedAt = new Date().toISOString();
    await incident.save();

    // Create audit entry
    await AuditModel.create({
      incidentId: incident._id.toString(),
      action: action === "invalidate" ? "invalidated" : action === "resolve" ? "resolved" : "overridden",
      previousValue: previousState,
      newValue: {
        triageCategory: incident.triageCategory,
        priority: incident.priority,
        status: incident.status,
      },
      reason,
      timestamp: new Date().toISOString(),
      actor: "dispatcher",
    });

    // Broadcast update
    sseManager.broadcast("incident:updated", incident.toJSON());

    res.json({ success: true, data: incident.toJSON() });
  } catch (err) {
    console.error("[Incidents] Override error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- GET /api/incidents/:id/audit — Get audit trail ---
router.get("/:id/audit", async (req: Request, res: Response) => {
  try {
    const auditEntries = await AuditModel.find({ incidentId: req.params.id })
      .sort({ timestamp: -1 });
    res.json({ success: true, data: auditEntries.map((a) => a.toJSON()) });
  } catch (err) {
    console.error("[Incidents] Audit error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
