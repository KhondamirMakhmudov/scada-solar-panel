// useWebSocket.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(
  url,
  {
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectInterval = 30000,
    heartbeatInterval = 25000,
  } = {}
) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef(null);

  const [status, setStatus] = useState("closed"); // "connecting","open","closed","error"
  const [messages, setMessages] = useState([]);

  const safeParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const clearHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // server should respond with pong or ignore; adjust if protocol differs
        wsRef.current.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, heartbeatInterval);
  };

  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStatus("open");
      startHeartbeat();
      setMessages((prev) => [
        ...prev,
        { direction: "system", text: "connected" },
      ]);
    };

    ws.onmessage = (evt) => {
      const payload = safeParse(evt.data);
      setMessages((prev) => [
        ...prev,
        {
          direction: "in",
          text: payload,
          raw: evt.data,
          time: new Date().toISOString(),
        },
      ]);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("error");
    };

    ws.onclose = (ev) => {
      clearHeartbeat();
      setStatus("closed");
      setMessages((prev) => [
        ...prev,
        { direction: "system", text: `closed (code=${ev.code})` },
      ]);

      if (autoReconnect) {
        // exponential backoff with cap
        reconnectAttemptsRef.current += 1;
        const backoff = Math.min(
          maxReconnectInterval,
          reconnectInterval * 2 ** (reconnectAttemptsRef.current - 1)
        );
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, backoff);
      }
    };
  }, [
    url,
    autoReconnect,
    reconnectInterval,
    maxReconnectInterval,
    heartbeatInterval,
  ]);

  const disconnect = useCallback(() => {
    autoReconnect &&
      reconnectTimerRef.current &&
      clearTimeout(reconnectTimerRef.current);
    clearHeartbeat();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        console.warn(e);
      }
      wsRef.current = null;
    }
    setStatus("closed");
  }, [autoReconnect]);

  const send = useCallback((data) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    wsRef.current.send(payload);
    setMessages((prev) => [
      ...prev,
      {
        direction: "out",
        text: data,
        raw: payload,
        time: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    // auto connect on mount
    connect();
    return () => {
      // cleanup
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearHeartbeat();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [connect]);

  return { status, messages, send, connect, disconnect };
}
