import { useState } from "react";
import { toast } from "react-hot-toast";
import MethodModal from "@/components/modal/method-modal";
import {
  Memory,
  ContentCopyRounded,
  VisibilityRounded,
  VisibilityOffRounded,
  CheckCircleRounded,
  CancelRounded,
} from "@mui/icons-material";
import { connectionIcon } from "@/features/connections/ConnectionDetailsModal";
import { buildParamRows, isSecretParamKey, isTechnicalParamKey } from "./deviceDisplay";

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

/** Identical row shape to ConnectionDetailsModal's ParamRow — a device's params list should look like a connection's, not a different UI for what's the same kind of data. */
function ParamRow({ row }) {
  const { key, label, value } = row;
  const [revealed, setRevealed] = useState(false);
  const isSecret = isSecretParamKey(key);
  const isEmpty = value === null || value === undefined || value === "";
  const isBoolean = typeof value === "boolean";

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
          <span
            className={`text-[14.5px] truncate text-right ${
              isTechnicalParamKey(key) ? "font-ibmPlexMono text-text-primary" : "text-text-secondary"
            }`}
            title={String(displayValue)}
          >
            {String(displayValue)}
          </span>
        )}
        {!isEmpty && !isSecret && isTechnicalParamKey(key) && <CopyButton value={value} title={`Скопировать: ${label}`} />}
      </div>
    </div>
  );
}

/**
 * Read-only device detail view, rebuilt to the same standard as
 * ConnectionDetailsModal: an identity header (icon/name/ID/status/protocol)
 * plus every key `params` actually contains, rendered generically — instead
 * of the old fixed "Тип протокола / Slave address" pair that assumed every
 * device is Modbus and silently showed nothing for one that isn't.
 */
const DeviceDetailsModal = ({ device, connectionName, tagCount = 0, onClose }) => {
  if (!device) return null;

  const protocolType = device.params?.type;
  const Icon = protocolType ? connectionIcon(protocolType) : Memory;
  const paramRows = buildParamRows(device.params);

  const handleCopyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(device, null, 2));
      toast.success("JSON скопирован в буфер обмена");
    } catch {
      toast.error("Буфер обмена недоступен в этом браузере");
    }
  };

  return (
    <MethodModal open={Boolean(device)} onClose={onClose} closeClick={onClose} showCloseIcon title="Детали устройства" width={640}>
      <div className="font-ibmPlexSans space-y-3.5">
        {/* Identity header */}
        <div className="flex items-start justify-between gap-3 flex-wrap p-3.5 rounded-[8px] border border-surface-border bg-background-dark/60">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 flex-shrink-0 rounded-[8px] bg-primary/15 border border-primary/40 flex items-center justify-center text-blue-300">
              <Icon fontSize="small" />
            </span>
            <div className="min-w-0">
              <p className="text-text-primary text-[16px] font-semibold truncate">{device.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-text-faint text-[13px] font-ibmPlexMono truncate">{device.id}</span>
                <CopyButton value={device.id} title="Скопировать ID" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {protocolType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] border border-surface-border-hover bg-white/[0.03] text-[13px] font-ibmPlexMono text-text-secondary">
                {protocolType}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] border text-[13px] font-semibold uppercase tracking-wide ${
                device.enabled ? "border-status-ok/50 bg-status-ok/10 text-status-ok" : "border-status-fault/50 bg-status-fault/10 text-status-fault"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
              {device.enabled ? "Включено" : "Отключено"}
            </span>
          </div>
        </div>

        {/* Identity fields not part of params */}
        <div className="rounded-[8px] border border-surface-border bg-background-dark/40 overflow-hidden">
          <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-surface-border/70">
            <span className="w-[38%] flex-shrink-0 text-[14px] text-text-muted">Описание</span>
            <span className="flex-1 min-w-0 text-[14.5px] text-text-secondary text-right truncate" title={device.description || ""}>
              {device.description || "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-surface-border/70">
            <span className="w-[38%] flex-shrink-0 text-[14px] text-text-muted">Подключение</span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5 justify-end">
              <span className="text-[14.5px] font-ibmPlexMono text-text-primary truncate" title={device.connectionId}>
                {connectionName || device.connectionId || "—"}
              </span>
              <CopyButton value={device.connectionId} title="Скопировать ID подключения" />
            </div>
          </div>
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="w-[38%] flex-shrink-0 text-[14px] text-text-muted">Тегов</span>
            <span className="flex-1 min-w-0 text-[14.5px] font-ibmPlexMono text-text-primary text-right">{tagCount}</span>
          </div>
        </div>

        {/* Params — every key the backend actually sent, generic across protocols */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-text-muted">Параметры устройства</p>
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
              Устройство не вернуло параметров
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
          {device.createdAt ? `Создано: ${new Date(device.createdAt).toLocaleString()} · ` : ""}
          Обновлено: {device.updatedAt ? new Date(device.updatedAt).toLocaleString() : "—"}
        </p>
      </div>
    </MethodModal>
  );
};

export default DeviceDetailsModal;
