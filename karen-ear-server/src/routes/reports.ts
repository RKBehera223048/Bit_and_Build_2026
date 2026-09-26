// ============================================================
// Report Routes — POST new reports, GET all reports
// ============================================================

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ReportModel } from "../models/Report";
import { IncidentModel } from "../models/Incident";
import { AuditModel } from "../models/AuditLog";
import { processExtraction } from "../services/extraction";
import { calculatePriority } from "../services/triage";
import { findCorrelation } from "../services/correlation";
import { sseManager } from "./sse";
import type { Incident, Report } from "../types";
import landmarksData from "../data/nyc-landmarks.json";

const router = Router();

// --- POST /api/reports — Ingest a new report ---
router.post("/", async (req: Request, res: Response) => {
  try {
    const { source, rawText } = req.body;

    if (!source || !rawText) {
      res.status(400).json({ success: false, error: "source and rawText are required" });
      return;
    }

    // 1. Create and save report
    const report = new ReportModel({
      receivedAt: new Date().toISOString(),
      source,
      rawText,
      status: "new",
    });
    await report.save();

    const reportData: Report = report.toJSON() as unknown as Report;

    // Broadcast new report
    sseManager.broadcast("report:new", reportData);

    // 2. Extract structured data from report
    const extraction = await processExtraction(rawText);

    // Resolve location coordinates from landmark
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
    const activeIncidents = await IncidentModel.find({ status: "active" }).lean();
    const incidentsForCorrelation = activeIncidents.map((inc) => ({
      ...inc,
      id: inc._id.toString(),
    })) as unknown as Incident[];

    const correlation = findCorrelation(
      extraction,
      incidentsForCorrelation,
      rawText,
      reportData.receivedAt
    );

    if (correlation.shouldMerge && correlation.matchedIncidentId) {
      // --- Merge into existing incident ---
      const existingIncident = await IncidentModel.findById(correlation.matchedIncidentId);
      if (existingIncident) {
        existingIncident.reportIds.push(reportData.id);
        existingIncident.corroborationCount += 1;
        existingIncident.updatedAt = new Date().toISOString();

        // Recalculate priority with new corroboration count
        const newTriage = calculatePriority(existingIncident.extraction, existingIncident.corroborationCount);
        existingIncident.priority = newTriage.priority;
        existingIncident.triageCategory = newTriage.triageCategory;
        existingIncident.priorityReasons = newTriage.reasons;

        await existingIncident.save();

        // Create audit entry for merge
        await AuditModel.create({
          incidentId: existingIncident._id.toString(),
          action: "merged",
          previousValue: { corroborationCount: existingIncident.corroborationCount - 1 },
          newValue: { corroborationCount: existingIncident.corroborationCount, mergeReason: correlation.mergeReason },
          reason: `Report merged: ${correlation.mergeReason}`,
          timestamp: new Date().toISOString(),
          actor: "system",
        });

        // Update report status
        report.status = "processed";
        await report.save();

        // Broadcast
        sseManager.broadcast("incident:merged", existingIncident.toJSON());
        sseManager.broadcast("report:updated", report.toJSON());

        res.status(200).json({
          success: true,
          data: {
            report: reportData,
            action: "merged",
            incidentId: existingIncident._id.toString(),
            mergeReason: correlation.mergeReason,
          },
        });
        return;
      }
    }

    // --- Create new incident ---
    const triage = calculatePriority(extraction);
    const now = new Date().toISOString();

    const incident = new IncidentModel({
      latitude,
      longitude,
      reportIds: [reportData.id],
      extraction,
      priority: triage.priority,
      triageCategory: triage.triageCategory,
      priorityReasons: triage.reasons,
      corroborationCount: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await incident.save();

    // Create audit entry
    await AuditModel.create({
      incidentId: incident._id.toString(),
      action: "created",
      previousValue: null,
      newValue: { incidentType: extraction.incidentType, triageCategory: triage.triageCategory },
      reason: `New incident: ${extraction.summary}`,
      timestamp: now,
      actor: "system",
    });

    // Update report status
    report.status = "processed";
    await report.save();

    // Broadcast
    sseManager.broadcast("incident:new", incident.toJSON());
    sseManager.broadcast("report:updated", report.toJSON());

    res.status(201).json({
      success: true,
      data: {
        report: reportData,
        action: "created",
        incident: incident.toJSON(),
      },
    });
  } catch (err) {
    console.error("[Reports] Error processing report:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// --- GET /api/reports — List all reports ---
router.get("/", async (_req: Request, res: Response) => {
  try {
    const reports = await ReportModel.find().sort({ receivedAt: -1 }).limit(100);
    res.json({ success: true, data: reports.map((r) => r.toJSON()) });
  } catch (err) {
    console.error("[Reports] Error fetching reports:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
