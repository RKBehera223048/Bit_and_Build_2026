// ============================================================
// Zustand Stores — Incident, Report, and UI State
// ============================================================

import { create } from "zustand";
import type { Incident, Report, DashboardStats } from "../types";
import { API_URL } from "../lib/utils";

// --- Incident Store ---
interface IncidentState {
  incidents: Incident[];
  selectedIncidentId: string | null;
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (incident: Incident) => void;
  selectIncident: (id: string | null) => void;
  getSelectedIncident: () => Incident | null;
  fetchIncidents: () => Promise<void>;
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  selectedIncidentId: null,

  setIncidents: (incidents) => set({ incidents }),

  addIncident: (incident) =>
    set((state) => ({
      incidents: [incident, ...state.incidents].sort((a, b) => b.priority - a.priority),
    })),

  updateIncident: (incident) =>
    set((state) => ({
      incidents: state.incidents
        .map((i) => (i.id === incident.id ? incident : i))
        .sort((a, b) => b.priority - a.priority),
    })),

  selectIncident: (id) => set({ selectedIncidentId: id }),

  getSelectedIncident: () => {
    const state = get();
    return state.incidents.find((i) => i.id === state.selectedIncidentId) || null;
  },

  fetchIncidents: async () => {
    try {
      const res = await fetch(`${API_URL}/api/incidents`);
      const json = await res.json();
      if (json.success) {
        set({ incidents: json.data.sort((a: Incident, b: Incident) => b.priority - a.priority) });
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    }
  },
}));

// --- Report Store ---
interface ReportState {
  reports: Report[];
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  updateReport: (report: Report) => void;
  fetchReports: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set) => ({
  reports: [],

  setReports: (reports) => set({ reports }),

  addReport: (report) =>
    set((state) => ({
      reports: [report, ...state.reports].slice(0, 100),
    })),

  updateReport: (report) =>
    set((state) => ({
      reports: state.reports.map((r) => (r.id === report.id ? report : r)),
    })),

  fetchReports: async () => {
    try {
      const res = await fetch(`${API_URL}/api/reports`);
      const json = await res.json();
      if (json.success) {
        set({ reports: json.data });
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  },
}));

// --- UI Store ---
interface UIState {
  isDrawerOpen: boolean;
  isFeedRunning: boolean;
  stats: DashboardStats;
  openDrawer: () => void;
  closeDrawer: () => void;
  setFeedRunning: (running: boolean) => void;
  setStats: (stats: DashboardStats) => void;
  fetchStats: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  isDrawerOpen: false,
  isFeedRunning: false,
  stats: {
    totalReports: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    reportsPerMinute: 0,
    lastProcessedAt: null,
    systemStatus: "online",
  },

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  setFeedRunning: (running) => set({ isFeedRunning: running }),
  setStats: (stats) => set({ stats }),

  fetchStats: async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      const json = await res.json();
      if (json.success) {
        set({ stats: json.data });
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  },
}));
