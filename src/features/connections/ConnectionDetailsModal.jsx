import { useState } from "react";
import { toast } from "react-hot-toast";
import MethodModal from "@/components/modal/method-modal";
import {
  Lan,
  Usb,
  SettingsEthernet,
  ContentCopyRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  WarningAmberRounded,
  CheckCircleRounded,
  CancelRounded,
} from "@mui/icons-material";
import {
  buildParamRows,
  isInsecureSecurityValue,
  isSecretParamKey,
  isTechnicalParamKey,
} from "./connectionDisplay";

/** Serial transports get the USB glyph; everything else talks over a network of some kind. OPC UA gets its own icon — it isn't "just TCP" the way Modbus TCP is, and the old `type.includes("TCP")` check silently mis-drew it with the serial icon. */
export function connectionIcon(type) {
  if (type === "MODBUS_RTU") return Usb;
  if (type === "OPC_UA") return SettingsEthernet;
  return Lan;
}

function CopyButton({ value, title = "Скопировать" }) {
  const [copied, setCopied] = useState(false);
  if (value === undefined || value === null || value === "") return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Буфер обмена недоступен в этом браузере");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[8px] text-text-faint hover:text-text-primary hover:bg-white/[0.06] active:scale-90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
    >
      {copied ? (
        <CheckCircleRounded sx={{ fontSize: 14 }} className="text-status-ok" />
      ) : (
        <ContentCopyRounded sx={{ fontSize: 13 }} />
      )}
    </button>
  );
}

function ParamRow({ row }) {
  const { key, label, value } = row;
  const [revealed, setRevealed] = useState(false);
  const isSecret = isSecretParamKey(key);
  const isEmpty = value === null || value === undefined || value === "";
  const isBoolean = typeof value === "boolean";
  const insecure = isInsecureSecurityValue(key, value);

  let displayValue = value;
  if (typeof value === "number" && /_ms$/.test(key)) displayValue = `${value} мс`;

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-surface-border/70 last:border-b-0 hover:bg-white/[0.02] transition-colors">
      <span className="w-[38%] flex-shrink-0 text-[14px] text-text-muted truncate">{label}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end">
        {isEmpty ? (
          <span className="text-[14.5px] text-text-faint font-ibmPlexMono">—</span>
        ) : isBoolean ? (
          <span
            className={`inline-flex items-center gap-1 text-[13px] font-medium px-1.5 py-0.5 rounded-[8px] ${
              value ? "text-status-ok bg-status-ok/10" : "text-text-muted bg-white/5"
            }`}
          >
            {value ? <CheckCircleRounded sx={{ fontSize: 12 }} /> : <CancelRounded sx={{ fontSize: 12 }} />}
            {value ? "Да" : "Нет"}
          </span>
        ) : isSecret ? (
          <>
            <span className="text-[14.5px] font-ibmPlexMono text-text-primary tracking-wider">
              {revealed ? String(value) : "••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              title={revealed ? "Скрыть" : "Показать"}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[8px] text-text-faint hover:text-text-primary hover:bg-white/[0.06] active:scale-90 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
            >
              {revealed ? <VisibilityOffRounded sx={{ fontSize: 14 }} /> : <VisibilityRounded sx={{ fontSize: 14 }} />}
            </button>
          </>
        ) : (
          <>
            {insecure && (
              <span title="Сессия без шифрования/подписи трафика">
                <WarningAmberRounded sx={{ fontSize: 14 }} className="text-status-warn" />
              </span>
            )}
            <span
              className={`text-[14.5px] truncate text-right ${
                isTechnicalParamKey(key) ? "font-ibmPlexMono text-text-primary" : "text-text-secondary"
              } ${insecure ? "text-status-warn" : ""}`}
              title={String(displayValue)}
            >
              {String(displayValue)}
            </span>
          </>
        )}
        {!isEmpty && !isSecret && isTechnicalParamKey(key) && <CopyButton value={value} title={`Скопировать: ${label}`} />}
      </div>
    </div>
  );
}

/**
 * Read-only connection detail view. Rebuilt around the actual shape of
 * `params` instead of four fixed fields (Хост/Порт/Таймаут/Протокол) that
 * only ever matched Modbus TCP — an OPC UA connection showed three blank
 * rows and never surfaced endpoint_url, security settings, or credentials
 * at all. Every key the backend actually returned is listed now (see
 * connectionDisplay.js for the label dictionary + fallback humanizer), so a
 * field added to a future protocol shows up without a code change here.
 */
const ConnectionDetailsModal = ({ connection, onClose }) => {
  if (!connection) return null;

  const Icon = connectionIcon(connection.type);
  const paramRows = buildParamRows(connection.params);
  const hasInsecureOpcSession = paramRows.some((row) => isInsecureSecurityValue(row.key, row.value));

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(connection, null, 2));
      toast.success("JSON скопирован в буфер обмена");
    } catch {
      toast.error("Буфер обмена недоступен в этом браузере");
    }
  };

  return (
    <MethodModal open={Boolean(connection)} onClose={onClose} closeClick={onClose} showCloseIcon title="Детали подключения" width={640}>
      <div className="font-ibmPlexSans space-y-3.5">
        {/* Identity header */}
        <div className="flex items-start justify-between gap-3 flex-wrap p-3.5 rounded-[8px] border border-surface-border bg-background-dark/60">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 flex-shrink-0 rounded-[8px] bg-primary/15 border border-primary/40 flex items-center justify-center text-blue-300">
              <Icon fontSize="small" />
            </span>
            <div className="min-w-0">
              <p className="text-text-primary text-[16px] font-semibold truncate">{connection.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-text-faint text-[13px] font-ibmPlexMono truncate">{connection.id}</span>
                <CopyButton value={connection.id} title="Скопировать ID" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] border border-surface-border-hover bg-white/[0.03] text-[13px] font-ibmPlexMono text-text-secondary">
              {connection.type}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] border text-[13px] font-semibold uppercase tracking-wide ${
                connection.enabled ? "border-status-ok/50 bg-status-ok/10 text-status-ok" : "border-status-fault/50 bg-status-fault/10 text-status-fault"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
              {connection.enabled ? "Включено" : "Отключено"}
            </span>
          </div>
        </div>

        {hasInsecureOpcSession && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-[8px] border border-status-warn/40 bg-status-warn/10">
            <WarningAmberRounded sx={{ fontSize: 16 }} className="text-status-warn flex-shrink-0 mt-0.5" />
            <p className="text-[13.5px] text-status-warn leading-snug">
              Сессия работает без шифрования и подписи (Security Mode/Policy — None). Трафик OPC UA идёт в открытом виде.
            </p>
          </div>
        )}

        {/* Params — every key the backend actually sent, generic across protocols */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">Параметры подключения</p>
            <button
              type="button"
              onClick={handleCopyRaw}
              className="flex items-center gap-1 text-[13px] text-text-faint hover:text-text-secondary transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 rounded-[8px] px-1"
            >
              <ContentCopyRounded sx={{ fontSize: 12 }} />
              Скопировать как JSON
            </button>
          </div>

          {paramRows.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-[13.5px] text-text-faint rounded-[8px] border border-surface-border bg-background-dark/40">
              Подключение не вернуло параметров
            </p>
          ) : (
            <div className="rounded-[8px] border border-surface-border bg-background-dark/40 overflow-hidden">
              {paramRows.map((row) => (
                <ParamRow key={row.key} row={row} />
              ))}
            </div>
          )}
        </div>

        <p className="text-[13px] text-text-faint pt-1">
          Создано: {connection.createdAt ? new Date(connection.createdAt).toLocaleString() : "—"}
          {connection.updatedAt && connection.updatedAt !== connection.createdAt
            ? ` · Обновлено: ${new Date(connection.updatedAt).toLocaleString()}`
            : ""}
        </p>
      </div>
    </MethodModal>
  );
};

export default ConnectionDetailsModal;
