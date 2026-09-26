// ============================================================
// Simulated Report Feed Generator
// ============================================================

import scenarioReports from "../data/scenario-reports.json";
import type { ReportSource } from "../types";

interface ScenarioReport {
  id: string;
  source: ReportSource;
  rawText: string;
  delaySeconds: number;
}

export class FeedSimulator {
  private reports: ScenarioReport[];
  private currentIndex: number = 0;
  private interval: NodeJS.Timeout | null = null;
  private onReport: (report: { source: ReportSource; rawText: string }) => void;
  private intervalMs: number;

  constructor(
    onReport: (report: { source: ReportSource; rawText: string }) => void,
    intervalMs: number = 8000
  ) {
    this.reports = scenarioReports as ScenarioReport[];
    this.onReport = onReport;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.interval) return;

    console.log(`[Feed] Starting simulated feed (${this.intervalMs}ms interval, ${this.reports.length} reports)`);

    // Send first report immediately
    this.sendNext();

    this.interval = setInterval(() => {
      this.sendNext();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("[Feed] Stopped simulated feed");
    }
  }

  reset(): void {
    this.stop();
    this.currentIndex = 0;
    console.log("[Feed] Reset feed to beginning");
  }

  sendNext(): void {
    if (this.currentIndex >= this.reports.length) {
      // Loop back to start
      this.currentIndex = 0;
      console.log("[Feed] Looping back to beginning of scenarios");
    }

    const report = this.reports[this.currentIndex];
    this.currentIndex++;

    this.onReport({
      source: report.source,
      rawText: report.rawText,
    });
  }

  sendManual(source: ReportSource, rawText: string): void {
    this.onReport({ source, rawText });
  }

  getStatus(): { running: boolean; currentIndex: number; totalReports: number } {
    return {
      running: this.interval !== null,
      currentIndex: this.currentIndex,
      totalReports: this.reports.length,
    };
  }

  setInterval(ms: number): void {
    this.intervalMs = ms;
    if (this.interval) {
      this.stop();
      this.start();
    }
  }
}
