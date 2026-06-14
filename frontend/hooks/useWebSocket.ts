"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WSMessage, WSProgressMessage } from "@/lib/types";

const WS_URL = "ws://localhost:8001/ws/progress";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [jobs, setJobs] = useState<Map<string, WSProgressMessage>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        if (msg.type === "sync") {
          setJobs((prev) => {
            const next = new Map(prev);
            msg.jobs.forEach((j) => {
              const existing = next.get(j.job_id);
              if (existing) {
                next.set(j.job_id, { ...existing, ...j });
              } else {
                next.set(j.job_id, j);
              }
            });
            return next;
          });
        } else if (msg.type === "progress") {
          setJobs((prev) => {
            const next = new Map(prev);
            const existing = next.get(msg.job_id);
            next.set(msg.job_id, { ...(existing || msg), ...msg });
            return next;
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Reconnect after 3s
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    // Ping every 30s to keep alive
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 30000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const jobList = Array.from(jobs.values()).sort(
    (a, b) => (b.job_id > a.job_id ? 1 : -1) // rough sort by creation
  );

  return { isConnected, jobs: jobList };
}
