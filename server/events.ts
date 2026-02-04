import { EventEmitter } from "events";
import type { Response } from "express";

export type EventType = 
  | "notifications"
  | "workorders"
  | "assets"
  | "parts"
  | "dashboard"
  | "dvirs"
  | "tires";

interface SSEClient {
  id: string;
  orgId: number;
  res: Response;
}

class AppEventEmitter extends EventEmitter {
  private clients: Map<string, SSEClient> = new Map();

  addClient(clientId: string, orgId: number, res: Response): void {
    this.clients.set(clientId, { id: clientId, orgId, res });
    
    res.on("close", () => {
      this.clients.delete(clientId);
    });
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  broadcast(eventType: EventType, orgId: number, data?: any): void {
    const message = JSON.stringify({ type: eventType, data, timestamp: Date.now() });
    
    const clients = Array.from(this.clients.values());
    for (const client of clients) {
      if (client.orgId === orgId) {
        try {
          client.res.write(`data: ${message}\n\n`);
        } catch (e) {
          this.clients.delete(client.id);
        }
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const appEvents = new AppEventEmitter();
