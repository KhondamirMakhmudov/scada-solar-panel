// useWebSocket.js
import { useEffect, useRef, useState, useCallback } from "react";

export function buildScadaWsUrl({ baseHttpUrl, channel = "devices", id }) {
  if (!id) throw new Error("id is required");

  const fallbackOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const inputBase = (baseHttpUrl || fallbackOrigin).replace(/\/+$/, "");

  let wsBase = inputBase
    .replace(/^http:\/\//i, "ws://")
    .replace(/^https:\/\//i, "wss://");

  if (!/^wss?:\/\//i.test(wsBase)) {
    wsBase = `ws://${wsBase.replace(/^\/+/, "")}`;
  }

  const hasApiV1 = /\/api\/v1$/i.test(wsBase);
  const prefix = hasApiV1 ? wsBase : `${wsBase}/api/v1`;

  return `${prefix}/ws/${channel}/${encodeURIComponent(id)}`;
}

export function useWebSocket(
  url,
  {
    autoConnect = true,
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectInterval = 30000,
    heartbeatInterval = 25000,
    heartbeatMessage = "ping",
    maxMessages = 500,
    onMessage,
  } = {},
) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef(null);
  const shouldReconnectRef = useRef(autoReconnect);

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
        const payload =
          typeof heartbeatMessage === "string"
            ? heartbeatMessage
            : JSON.stringify(heartbeatMessage);
        wsRef.current.send(payload);
      }
    }, heartbeatInterval);
  };

  const appendMessage = useCallback(
    (message) => {
      setMessages((prev) => {
        const next = [...prev, message];
        if (next.length > maxMessages) {
          return next.slice(next.length - maxMessages);
        }
        return next;
      });
    },
    [maxMessages],
  );

  const connect = useCallback(() => {
    if (!url) {
      setStatus("error");
      return;
    }

    shouldReconnectRef.current = autoReconnect;

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
      appendMessage({ direction: "system", text: "подключено" });
    };

    ws.onmessage = (evt) => {
      const payload = safeParse(evt.data);
      const message = {
        direction: "in",
        text: payload,
        raw: evt.data,
        time: new Date().toISOString(),
      };
      appendMessage(message);
      onMessage?.(message);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("error");
    };

    ws.onclose = (ev) => {
      clearHeartbeat();
      setStatus("closed");
      appendMessage({
        direction: "system",
        text: `соединение закрыто (код=${ev.code})`,
      });

      if (shouldReconnectRef.current) {
        // exponential backoff with cap
        reconnectAttemptsRef.current += 1;
        const backoff = Math.min(
          maxReconnectInterval,
          reconnectInterval * 2 ** (reconnectAttemptsRef.current - 1),
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
    heartbeatMessage,
    appendMessage,
    onMessage,
  ]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    reconnectTimerRef.current && clearTimeout(reconnectTimerRef.current);
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
  }, []);

  const send = useCallback(
    (data) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not open");
      }
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      wsRef.current.send(payload);
      appendMessage({
        direction: "out",
        text: data,
        raw: payload,
        time: new Date().toISOString(),
      });
    },
    [appendMessage],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  useEffect(() => {
    // auto connect on mount
    if (autoConnect) {
      connect();
    }

    return () => {
      // cleanup
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      clearHeartbeat();
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [autoConnect, connect]);

  return { status, messages, send, connect, disconnect, clearMessages };
}
