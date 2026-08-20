import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Manages one real WebSocket per selected entity and presents them as a
 * single merged, entity-tagged feed.
 *
 * Why per-entity sockets instead of one "subscribe to many" connection: the
 * backend has no multi-subscribe protocol — WEBSOCKET_API.md documents
 * exactly `/ws/devices/{id}`, `/ws/tags/{id}`, `/ws/screens/{id}`, one
 * entity per socket, decided by the URL at connect time. Watching several
 * entities at once for real (not a fabricated "subscribe" frame) means
 * opening several real sockets and merging what they send.
 */
export function useMultiWebSocket({
  entities, // [{ id, name }]
  buildUrl, // (entityId) => wsUrl | null
  enabled,
  autoReconnect = true,
  reconnectInterval = 2000,
  maxReconnectInterval = 30000,
  heartbeatInterval = 25000,
  heartbeatMessage = "ping",
  maxMessages = 500,
}) {
  const connsRef = useRef(new Map()); // entityId -> { ws, reconnectAttempts, heartbeatTimer, reconnectTimer, shouldReconnect }
  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const frameSeqRef = useRef(0);

  const [connStatus, setConnStatus] = useState(new Map()); // entityId -> "connecting"|"open"|"closed"|"error"
  const [messages, setMessages] = useState([]);
  const [reconnectCount, setReconnectCount] = useState(0);

  const setStatusFor = useCallback((id, status) => {
    setConnStatus((prev) => {
      const next = new Map(prev);
      next.set(id, status);
      return next;
    });
  }, []);

  const appendMessage = useCallback(
    (partial) => {
      frameSeqRef.current += 1;
      const m = { seq: frameSeqRef.current, time: new Date().toISOString(), ...partial };
      setMessages((prev) => {
        const next = [...prev, m];
        return next.length > maxMessages ? next.slice(next.length - maxMessages) : next;
      });
    },
    [maxMessages],
  );

  const closeOne = useCallback((id) => {
    const state = connsRef.current.get(id);
    if (!state) return;
    state.shouldReconnect = false;
    clearTimeout(state.reconnectTimer);
    clearInterval(state.heartbeatTimer);
    try {
      state.ws?.close();
    } catch {
      /* socket already gone */
    }
    connsRef.current.delete(id);
    setConnStatus((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openOne = useCallback(
    (entity) => {
      const url = buildUrl(entity.id);
      if (!url) return;
      const existing = connsRef.current.get(entity.id);
      if (
        existing?.ws &&
        (existing.ws.readyState === WebSocket.OPEN || existing.ws.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const state = existing || { reconnectAttempts: 0 };
      state.shouldReconnect = autoReconnect;
      connsRef.current.set(entity.id, state);
      setStatusFor(entity.id, "connecting");

      const ws = new WebSocket(url);
      state.ws = ws;

      ws.onopen = () => {
        state.reconnectAttempts = 0;
        setStatusFor(entity.id, "open");
        clearInterval(state.heartbeatTimer);
        state.heartbeatTimer = setInterval(() => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(heartbeatMessage);
          appendMessage({
            entityId: entity.id,
            entityName: entity.name,
            direction: "out",
            raw: heartbeatMessage,
            parsed: null,
          });
        }, heartbeatInterval);
      };

      ws.onmessage = (evt) => {
        let parsed = null;
        try {
          parsed = JSON.parse(evt.data);
        } catch {
          parsed = null;
        }
        appendMessage({
          entityId: entity.id,
          entityName: entity.name,
          direction: "in",
          raw: evt.data,
          parsed,
        });
      };

      ws.onerror = () => setStatusFor(entity.id, "error");

      ws.onclose = (ev) => {
        clearInterval(state.heartbeatTimer);
        setStatusFor(entity.id, "closed");
        appendMessage({
          entityId: entity.id,
          entityName: entity.name,
          direction: "system",
          raw: `закрыто (код=${ev.code})`,
          parsed: null,
        });

        const stillWanted = entitiesRef.current.some((e) => e.id === entity.id);
        if (state.shouldReconnect && stillWanted) {
          state.reconnectAttempts += 1;
          setReconnectCount((c) => c + 1);
          const backoff = Math.min(
            maxReconnectInterval,
            reconnectInterval * 2 ** (state.reconnectAttempts - 1),
          );
          state.reconnectTimer = setTimeout(() => openOne(entity), backoff);
        }
      };
    },
    [buildUrl, autoReconnect, reconnectInterval, maxReconnectInterval, heartbeatInterval, heartbeatMessage, appendMessage, setStatusFor],
  );

  const entityIdsKey = useMemo(
    () => entities.map((e) => e.id).sort().join(","),
    [entities],
  );

  useEffect(() => {
    if (!enabled) {
      Array.from(connsRef.current.keys()).forEach(closeOne);
      return;
    }
    const wantedIds = new Set(entitiesRef.current.map((e) => e.id));
    Array.from(connsRef.current.keys()).forEach((id) => {
      if (!wantedIds.has(id)) closeOne(id);
    });
    entitiesRef.current.forEach((entity) => openOne(entity));
    // entityIdsKey (not entities) is the intentional dependency — stable
    // across re-renders that don't actually change which entities are
    // selected, so it won't tear down and reopen every socket on every
    // unrelated render.
  }, [enabled, entityIdsKey, openOne, closeOne]);

  useEffect(
    () => () => {
      Array.from(connsRef.current.keys()).forEach(closeOne);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const sendToAll = useCallback(
    (text) => {
      let sentAny = false;
      connsRef.current.forEach((state, id) => {
        if (state.ws?.readyState === WebSocket.OPEN) {
          state.ws.send(text);
          sentAny = true;
          const entity = entitiesRef.current.find((e) => e.id === id);
          appendMessage({
            entityId: id,
            entityName: entity?.name,
            direction: "out",
            raw: text,
            parsed: null,
          });
        }
      });
      return sentAny;
    },
    [appendMessage],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  const openCount = useMemo(
    () => Array.from(connStatus.values()).filter((s) => s === "open").length,
    [connStatus],
  );

  return {
    connStatus,
    openCount,
    messages,
    reconnectCount,
    sendToAll,
    clearMessages,
  };
}
