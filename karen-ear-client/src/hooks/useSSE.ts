// ============================================================
// SSE Hook — Connects to server event stream
// ============================================================

import { useEffect, useRef } from "react";
import { useIncidentStore, useReportStore, useUIStore } from "../stores";
import { API_URL } from "../lib/utils";

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const addReport = useReportStore((s) => s.addReport);
  const updateReport = useReportStore((s) => s.updateReport);
  const addIncident = useIncidentStore((s) => s.addIncident);
  const updateIncident = useIncidentStore((s) => s.updateIncident);
  const fetchStats = useUIStore((s) => s.fetchStats);

  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/api/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("report:new", (e) => {
      const { data } = JSON.parse(e.data);
      addReport(data);
      fetchStats();
    });

    eventSource.addEventListener("report:updated", (e) => {
      const { data } = JSON.parse(e.data);
      updateReport(data);
    });

    eventSource.addEventListener("incident:new", (e) => {
      const { data } = JSON.parse(e.data);
      addIncident(data);
      fetchStats();
    });

    eventSource.addEventListener("incident:updated", (e) => {
      const { data } = JSON.parse(e.data);
      updateIncident(data);
      fetchStats();
    });

    eventSource.addEventListener("incident:merged", (e) => {
      const { data } = JSON.parse(e.data);
      updateIncident(data);
      fetchStats();
    });

    eventSource.onerror = () => {
      console.warn("[SSE] Connection error, will auto-reconnect");
    };

    return () => {
      eventSource.close();
    };
  }, [addReport, updateReport, addIncident, updateIncident, fetchStats]);
}
