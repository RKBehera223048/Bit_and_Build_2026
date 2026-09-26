// ============================================================
// Header Component — System status bar
// ============================================================

import { useUIStore } from "../../stores";
import { API_URL, formatTime } from "../../lib/utils";
import { Activity, Radio, Zap, AlertTriangle } from "lucide-react";

export function Header() {
  const { stats, isFeedRunning, setFeedRunning } = useUIStore();

  const toggleFeed = async () => {
    try {
      if (isFeedRunning) {
        await fetch(`${API_URL}/api/feed/stop`, { method: "POST" });
        setFeedRunning(false);
      } else {
        await fetch(`${API_URL}/api/feed/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intervalMs: 8000 }),
        });
        setFeedRunning(true);
      }
    } catch (err) {
      console.error("Feed toggle failed:", err);
    }
  };

  const resetFeed = async () => {
    try {
      await fetch(`${API_URL}/api/feed/reset`, { method: "POST" });
      setFeedRunning(false);
      window.location.reload();
    } catch (err) {
      console.error("Feed reset failed:", err);
    }
  };

  return (
    <header className="bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between z-50">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E23636] to-[#2B3784] flex items-center justify-center text-lg font-bold shadow-lg shadow-red-500/20">
          🕷️
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white">
            KAREN'S EAR
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
            AI Emergency Dispatch Console
          </p>
        </div>
      </div>

      {/* Center: Stats */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs">
          <Radio className={`w-3.5 h-3.5 ${isFeedRunning ? "text-green-400 animate-pulse" : "text-gray-600"}`} />
          <span className="text-gray-400">
            {stats.reportsPerMinute} <span className="text-gray-600">rpt/min</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-white font-semibold">{stats.activeIncidents}</span>
          <span className="text-gray-600">active</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-gray-400">{stats.totalReports}</span>
          <span className="text-gray-600">reports</span>
        </div>

        {stats.lastProcessedAt && (
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-500">
              Last: {formatTime(stats.lastProcessedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Right: Feed Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleFeed}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
            isFeedRunning
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
          }`}
        >
          {isFeedRunning ? "⏹ Stop Feed" : "▶ Start Feed"}
        </button>
        <button
          onClick={resetFeed}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
        >
          ↺ Reset
        </button>
        <div className={`w-2 h-2 rounded-full ml-2 ${stats.systemStatus === "online" ? "bg-green-400 shadow-lg shadow-green-400/50" : "bg-red-400"}`} />
      </div>
    </header>
  );
}
