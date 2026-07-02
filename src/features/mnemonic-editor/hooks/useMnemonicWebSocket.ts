import { useCallback, useEffect, useMemo } from "react";
import { config } from "@/config";
import { buildScadaWsUrl, useWebSocket } from "@/hooks/useWebsoket";
import { useRuntimeStore } from "../store/runtimeStore";

interface IncomingMessage {
  text?: {
    tag_id?: string;
    value?: unknown;
    unit?: string | null;
    is_error?: boolean;
    error_message?: string | null;
    time?: string;
  };
}

/**
 * Opens the shared `ws/screens/{id}` channel (same infra proven in the
 * WebSocket test console at /dashboard/test/websocket — reconnect/backoff/
 * heartbeat already built into the shared hook, nothing new here) and feeds
 * every tag frame into runtimeStore. Used by both the editor (so an
 * engineer can see live values while binding shapes) and runtime/kiosk
 * mode.
 */
export function useMnemonicWebSocket(screenId: string | undefined, token: string | undefined) {
  const setConnectionStatus = useRuntimeStore((state) => state.setConnectionStatus);
  const applyTagFrame = useRuntimeStore((state) => state.applyTagFrame);

  const url = useMemo(() => {
    if (!screenId) return "";
    try {
      return buildScadaWsUrl({
        baseHttpUrl: config.SCREENS_API_URL,
        channel: "screens",
        id: screenId,
        token,
      });
    } catch {
      return "";
    }
  }, [screenId, token]);

  // useWebSocket's internal `connect` callback depends on `onMessage` — if
  // it got a fresh identity every render (e.g. an inline arrow function),
  // every EditorPage re-render (which happens on every drag pixel) would
  // trigger a full WebSocket disconnect/reconnect. applyTagFrame is a
  // stable Zustand action reference, so this stays stable across renders.
  const handleMessage = useCallback(
    (message: IncomingMessage) => {
      const data = message?.text;
      if (data && typeof data === "object" && data.tag_id) {
        applyTagFrame({ ...data, tag_id: data.tag_id });
      }
    },
    [applyTagFrame],
  );

  // useWebSocket is a plain JS hook (src/hooks/useWebsoket.jsx) — TS infers
  // its options type from the destructured defaults, which excludes
  // `onMessage` (no default value there to infer from). Building the
  // options as a variable rather than passing an object literal sidesteps
  // TS's excess-property check without needing an `as any` at the call site.
  const wsOptions = useMemo(
    () => ({
      autoConnect: Boolean(url),
      autoReconnect: true,
      heartbeatInterval: 25000,
      heartbeatMessage: "ping",
      maxMessages: 1,
      onMessage: handleMessage,
    }),
    [url, handleMessage],
  );

  const { status } = useWebSocket(url, wsOptions);

  useEffect(() => {
    setConnectionStatus(status === "open" ? "online" : status === "connecting" ? "connecting" : "offline");
  }, [status, setConnectionStatus]);
}
