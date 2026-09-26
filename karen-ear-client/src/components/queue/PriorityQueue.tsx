// ============================================================
// Priority Queue — Ranked "Swing First" incident list
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { useIncidentStore, useUIStore } from "../../stores";
import { TRIAGE_COLORS, TRIAGE_LABELS, TRIAGE_ICONS, INCIDENT_TYPE_LABELS } from "../../types";
import type { Incident } from "../../types";
import { timeAgo } from "../../lib/utils";
import { Shield, Users, MapPin, AlertCircle } from "lucide-react";

function IncidentCard({ incident, rank }: { incident: Incident; rank: number }) {
  const selectIncident = useIncidentStore((s) => s.selectIncident);
  const openDrawer = useUIStore((s) => s.openDrawer);
  const selectedId = useIncidentStore((s) => s.selectedIncidentId);
  const isSelected = selectedId === incident.id;
  const isTop = rank === 1;

  const color = TRIAGE_COLORS[incident.triageCategory];

  const handleClick = () => {
    selectIncident(incident.id);
    openDrawer();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      onClick={handleClick}
      className={`relative mx-3 mb-2 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        isSelected
          ? "border-white/20 bg-white/[0.06] shadow-lg"
          : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
      } ${isTop ? "ring-1" : ""}`}
      style={{
        borderColor: isTop ? color + "40" : undefined,
        boxShadow: isTop ? `0 0 20px ${color}15` : undefined,
        ringColor: isTop ? color + "30" : undefined,
      }}
    >
      {/* Priority indicator stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: color }}
      />

      <div className="pl-4 pr-3 py-3">
        {/* Top row: rank, category, time */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isTop && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500/20 to-blue-500/20 text-white font-bold border border-white/10">
                🕷️ SWING FIRST
              </span>
            )}
            {!isTop && (
              <span className="text-[10px] text-gray-600 font-mono">
                #{rank}
              </span>
            )}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
              style={{
                color: color,
                backgroundColor: color + "15",
                borderColor: color + "30",
              }}
            >
              {TRIAGE_ICONS[incident.triageCategory]} {TRIAGE_LABELS[incident.triageCategory]}
            </span>
          </div>
          <span className="text-[10px] text-gray-600">{timeAgo(incident.createdAt)}</span>
        </div>

        {/* Summary */}
        <p className="text-sm font-medium text-white/90 mb-2 leading-snug">
          {incident.extraction.summary}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" style={{ color }} />
            <span className="font-mono font-bold" style={{ color }}>{incident.priority}</span>/100
          </span>

          {incident.extraction.peopleAtRisk !== null && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-red-400" />
              {incident.extraction.peopleAtRisk} at risk
            </span>
          )}

          {incident.extraction.landmark && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-400" />
              {incident.extraction.landmark}
            </span>
          )}

          {incident.corroborationCount > 1 && (
            <span className="flex items-center gap-1 text-yellow-400">
              <AlertCircle className="w-3 h-3" />
              {incident.corroborationCount} reports
            </span>
          )}

          <span>{INCIDENT_TYPE_LABELS[incident.extraction.incidentType]}</span>
        </div>

        {/* Priority reason (first one only) */}
        {incident.priorityReasons.length > 0 && (
          <p className="text-[10px] text-gray-500 mt-2 italic leading-snug">
            "{incident.priorityReasons[0]}"
          </p>
        )}
      </div>

      {/* Status badge */}
      {incident.status !== "active" && (
        <div className={`absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-medium ${
          incident.status === "dispatched" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
        }`}>
          {incident.status}
        </div>
      )}
    </motion.div>
  );
}

export function PriorityQueue() {
  const incidents = useIncidentStore((s) => s.incidents);
  const activeIncidents = incidents.filter((i) => i.status === "active");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          🎯 Swing First Queue
        </h2>
        <p className="text-[10px] text-gray-600 mt-0.5">
          {activeIncidents.length} active incident{activeIncidents.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pt-2 scrollbar-thin">
        <AnimatePresence>
          {activeIncidents.map((incident, index) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              rank={index + 1}
            />
          ))}
        </AnimatePresence>

        {activeIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <Shield className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No active incidents</p>
            <p className="text-[10px] mt-1">All clear, Spider-Man</p>
          </div>
        )}
      </div>
    </div>
  );
}
