import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type EventType = 
  | "notifications"
  | "workorders"
  | "assets"
  | "parts"
  | "dashboard"
  | "dvirs"
  | "tires"
  | "connected";

interface SSEMessage {
  type: EventType;
  data?: any;
  timestamp: number;
}

type EventHandler = (event: SSEMessage) => void;

const eventHandlers = new Map<EventType, Set<EventHandler>>();
let eventSource: EventSource | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_DELAY = 30000;

function getReconnectDelay(): number {
  return Math.min(1000 * Math.pow(2, connectionAttempts), MAX_RECONNECT_DELAY);
}

function connect(): void {
  if (eventSource?.readyState === EventSource.OPEN) return;
  
  eventSource = new EventSource("/api/events", { withCredentials: true });
  
  eventSource.onopen = () => {
    connectionAttempts = 0;
    console.log("[SSE] Connected");
  };
  
  eventSource.onmessage = (event) => {
    try {
      const message: SSEMessage = JSON.parse(event.data);
      
      const handlers = eventHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }

      if (message.type !== "connected") {
        invalidateQueriesForEvent(message.type);
      }
    } catch (e) {
      console.error("[SSE] Failed to parse message:", e);
    }
  };
  
  eventSource.onerror = () => {
    console.log("[SSE] Connection error, reconnecting...");
    eventSource?.close();
    eventSource = null;
    connectionAttempts++;
    setTimeout(connect, getReconnectDelay());
  };
}

function invalidateQueriesForEvent(eventType: EventType): void {
  switch (eventType) {
    case "notifications":
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      break;
    case "workorders":
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders/recent"] });
      break;
    case "assets":
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      break;
    case "parts":
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      break;
    case "dashboard":
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/procurement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/parts-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/tire-health"] });
      queryClient.invalidateQueries({ queryKey: ["/api/predictions"] });
      break;
    case "dvirs":
      queryClient.invalidateQueries({ queryKey: ["/api/dvirs"] });
      break;
    case "tires":
      queryClient.invalidateQueries({ queryKey: ["/api/tires"] });
      break;
  }
}

function disconnect(): void {
  eventSource?.close();
  eventSource = null;
}

function subscribe(eventType: EventType, handler: EventHandler): () => void {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, new Set());
  }
  eventHandlers.get(eventType)!.add(handler);
  
  if (!eventSource || eventSource.readyState !== EventSource.OPEN) {
    connect();
  }
  
  return () => {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlers.delete(eventType);
      }
    }
    
    let totalHandlers = 0;
    eventHandlers.forEach(h => totalHandlers += h.size);
    if (totalHandlers === 0) {
      disconnect();
    }
  };
}

export function useEventSource(eventType?: EventType, handler?: EventHandler): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!eventType) {
      connect();
      return () => {};
    }
    
    const wrappedHandler: EventHandler = (event) => {
      handlerRef.current?.(event);
    };
    
    return subscribe(eventType, wrappedHandler);
  }, [eventType]);
}

export function useSSEConnection(): void {
  useEffect(() => {
    connect();
    return () => {};
  }, []);
}
