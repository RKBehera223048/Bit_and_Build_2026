// ============================================================
// Karen's Ear — Main App Component
// ============================================================

import { useEffect } from "react";
import { Header } from "./components/layout/Header";
import { ReportFeed } from "./components/feed/ReportFeed";
import { MapView } from "./components/map/MapView";
import { PriorityQueue } from "./components/queue/PriorityQueue";
import { IncidentDrawer } from "./components/drawer/IncidentDrawer";
import { useSSE } from "./hooks/useSSE";
import { useIncidentStore, useReportStore, useUIStore } from "./stores";
import "./index.css";

function App() {
  // Connect to SSE stream
  useSSE();

  // Fetch initial data
  const fetchIncidents = useIncidentStore((s) => s.fetchIncidents);
  const fetchReports = useReportStore((s) => s.fetchReports);
  const fetchStats = useUIStore((s) => s.fetchStats);

  useEffect(() => {
    fetchIncidents();
    fetchReports();
    fetchStats();

    // Poll stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchIncidents, fetchReports, fetchStats]);

  return (
    <div className="flex flex-col h-screen bg-[#08080d]">
      {/* Header */}
      <Header />

      {/* Main Content — 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail: Report Feed */}
        <div className="w-[300px] min-w-[300px] border-r border-white/5 bg-[#0a0a0f]/80 flex flex-col">
          <ReportFeed />
        </div>

        {/* Center: Map */}
        <div className="flex-1 relative">
          <MapView />
        </div>

        {/* Right Rail: Priority Queue */}
        <div className="w-[360px] min-w-[360px] border-l border-white/5 bg-[#0a0a0f]/80 flex flex-col">
          <PriorityQueue />
        </div>
      </div>

      {/* Incident Detail Drawer */}
      <IncidentDrawer />
    </div>
  );
}

export default App;
