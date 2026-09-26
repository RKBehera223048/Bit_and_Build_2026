// ============================================================
// SSE (Server-Sent Events) Manager
// Manages connected clients and broadcasts events
// ============================================================

import type { Response } from "express";
import type { SSEEventType } from "../types";

class SSEManager {
  private clients: Map<string, Response> = new Map();
  private clientCounter: number = 0;

  addClient(res: Response): string {
    const clientId = `client-${++this.clientCounter}`;

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

    this.clients.set(clientId, res);
    console.log(`[SSE] Client connected: ${clientId} (total: ${this.clients.size})`);

    // Remove client on disconnect
    res.on("close", () => {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId} (total: ${this.clients.size})`);
    });

    return clientId;
  }

  broadcast(eventType: SSEEventType, data: unknown): void {
    const payload = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });

    const deadClients: string[] = [];

    this.clients.forEach((res, clientId) => {
      try {
        res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      } catch {
        deadClients.push(clientId);
      }
    });

    // Clean up dead connections
    deadClients.forEach((id) => this.clients.delete(id));
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const sseManager = new SSEManager();
