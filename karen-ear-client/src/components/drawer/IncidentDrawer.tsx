// ============================================================
// Incident Drawer — Detailed view with audit trail & controls
// ============================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIncidentStore, useUIStore } from "../../stores";
import {
  TRIAGE_COLORS,
  TRIAGE_LABELS,
  TRIAGE_ICONS,
  INCIDENT_TYPE_LABELS,
  SOURCE_ICONS,
} from "../../types";
import type { AuditEntry, Report, TriageCategory } from "../../types";
import { API_URL, formatTime } from "../../lib/utils";
import {
  X,
  Shield,
  MapPin,
  Users,
  AlertTriangle,
  ChevronUp,
  Check,
  Send,
  Ban,
  Clock,
  FileText,
} from "lucide-react";

export function IncidentDrawer() {
  const isDrawerOpen = useUIStore((s) => s.isDrawerOpen);
  const closeDrawer = useUIStore((s) => s.closeDrawer);
  const selectedId = useIncidentStore((s) => s.selectedIncidentId);
  const incidents = useIncidentStore((s) => s.incidents);
  const updateIncident = useIncidentStore((s) => s.updateIncident);
  const incident = incidents.find((i) => i.id === selectedId);

  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "evidence" | "audit">("details");

  // Fetch audit trail when drawer opens
  useEffect(() => {
    if (incident && isDrawerOpen) {
      fetch(`${API_URL}/api/incidents/${incident.id}/audit`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setAuditTrail(json.data);
        })
        .catch(console.error);

      // Fetch associated reports
      fetch(`${API_URL}/api/reports`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const associated = json.data.filter((r: Report) =>
              incident.reportIds.includes(r.id)
            );
            setReports(associated);
          }
        })
        .catch(console.error);
    }
  }, [incident, isDrawerOpen]);

  const handleOverride = async (action: string, newTriageCategory?: TriageCategory) => {
    if (!incident || !overrideReason.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/incidents/${incident.id}/override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: overrideReason, newTriageCategory }),
      });
      const json = await res.json();
      if (json.success) {
        updateIncident(json.data);
        setOverrideReason("");
        // Refresh audit trail
        const auditRes = await fetch(`${API_URL}/api/incidents/${incident.id}/audit`);
        const auditJson = await auditRes.json();
        if (auditJson.success) setAuditTrail(auditJson.data);
      }
    } catch (err) {
      console.error("Override failed:", err);
    }
  };

  if (!incident) return null;

  const color = TRIAGE_COLORS[incident.triageCategory];

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] bg-[#0d0d14] border-l border-white/5 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5" style={{ borderBottomColor: color + "30" }}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs px-3 py-1 rounded-full font-bold border"
                  style={{ color, backgroundColor: color + "15", borderColor: color + "30" }}
                >
                  {TRIAGE_ICONS[incident.triageCategory]} {TRIAGE_LABELS[incident.triageCategory]}
                </span>
                <button
                  onClick={closeDrawer}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-lg font-bold text-white leading-tight">
                {incident.extraction.summary}
              </h2>

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 font-mono">
                  <Shield className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-white font-bold text-sm" style={{ color }}>{incident.priority}</span>/100
                </span>
                {incident.extraction.landmark && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {incident.extraction.landmark}
                  </span>
                )}
                {incident.extraction.peopleAtRisk !== null && (
                  <span className="flex items-center gap-1 text-red-400">
                    <Users className="w-3.5 h-3.5" />
                    {incident.extraction.peopleAtRisk} at risk
                  </span>
                )}
                <span>{INCIDENT_TYPE_LABELS[incident.extraction.incidentType]}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(["details", "evidence", "audit"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[11px] uppercase tracking-wider font-semibold transition-colors ${
                    activeTab === tab
                      ? "text-white border-b-2"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                  style={{ borderBottomColor: activeTab === tab ? color : "transparent" }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {/* DETAILS TAB */}
              {activeTab === "details" && (
                <div className="space-y-5">
                  {/* Priority Breakdown */}
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-3">
                      Why This Ranks #{incidents.filter((i) => i.status === "active").findIndex((i) => i.id === incident.id) + 1}
                    </h3>
                    <div className="space-y-2">
                      {incident.priorityReasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                          <span className="text-gray-600 mt-0.5">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hazards */}
                  {incident.extraction.hazards.length > 0 && (
                    <div>
                      <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                        Active Hazards
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {incident.extraction.hazards.map((hazard, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                          >
                            ⚠ {hazard}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence */}
                  <div>
                    <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                      Extraction Confidence
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${incident.extraction.confidence * 100}%`,
                            backgroundColor: incident.extraction.confidence > 0.7 ? "#27AE60" : incident.extraction.confidence > 0.4 ? "#F5A623" : "#E23636",
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {Math.round(incident.extraction.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Method: {incident.extraction.extractionMethod}
                    </p>
                  </div>

                  {/* Clarification needed */}
                  {incident.extraction.needsClarification && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <div className="flex items-center gap-2 text-yellow-400 text-xs font-semibold mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Needs Clarification
                      </div>
                      <p className="text-[11px] text-yellow-300/70">
                        Location could not be confirmed. Verify before dispatching.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* EVIDENCE TAB */}
              {activeTab === "evidence" && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                    Source Reports ({incident.reportIds.length})
                  </h3>
                  {reports.map((report) => (
                    <div key={report.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">
                          {SOURCE_ICONS[report.source]} {report.source}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {formatTime(report.receivedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        "{report.rawText}"
                      </p>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-xs text-gray-600">Loading source reports...</p>
                  )}
                </div>
              )}

              {/* AUDIT TAB */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                    Decision History
                  </h3>
                  {auditTrail.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          entry.actor === "dispatcher" ? "bg-blue-400" : "bg-gray-600"
                        }`} />
                        <div className="w-px flex-1 bg-white/5" />
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-gray-300">{entry.reason}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-600">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTime(entry.timestamp)}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            entry.actor === "dispatcher"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}>
                            {entry.actor}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditTrail.length === 0 && (
                    <p className="text-xs text-gray-600">No audit entries yet</p>
                  )}
                </div>
              )}
            </div>

            {/* Override Controls */}
            <div className="border-t border-white/5 p-4 space-y-3">
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override..."
                className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleOverride("escalate")}
                  disabled={!overrideReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronUp className="w-3.5 h-3.5" /> Escalate
                </button>
                <button
                  onClick={() => handleOverride("dispatch")}
                  disabled={!overrideReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Dispatch
                </button>
                <button
                  onClick={() => handleOverride("resolve")}
                  disabled={!overrideReason.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Check className="w-3.5 h-3.5" /> Resolve
                </button>
                <button
                  onClick={() => handleOverride("invalidate")}
                  disabled={!overrideReason.trim()}
                  className="px-3 py-2 text-[11px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
