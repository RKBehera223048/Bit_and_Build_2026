// ============================================================
// Report Feed — Live scrolling feed of incoming reports
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { useReportStore } from "../../stores";
import { SOURCE_ICONS } from "../../types";
import { timeAgo } from "../../lib/utils";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processed: "bg-green-500/20 text-green-400 border-green-500/30",
  flagged: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  invalid: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ReportFeed() {
  const reports = useReportStore((s) => s.reports);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Live Feed
        </h2>
        <p className="text-[10px] text-gray-600 mt-0.5">
          {reports.length} reports received
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="border-b border-white/5 px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{SOURCE_ICONS[report.source]}</span>
                  <span className="text-[10px] font-medium text-gray-500 uppercase">
                    {report.source}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                      STATUS_STYLES[report.status] || STATUS_STYLES.new
                    }`}
                  >
                    {report.status}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {timeAgo(report.receivedAt)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                {report.rawText}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {reports.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600">
            <Radio className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Waiting for reports...</p>
            <p className="text-[10px] mt-1">Start the feed to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Need to import Radio for empty state
import { Radio } from "lucide-react";
