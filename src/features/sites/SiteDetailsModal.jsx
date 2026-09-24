import MethodModal from "@/components/modal/method-modal";
import { SolarPowerRounded } from "@mui/icons-material";
import {
  formatDateTime,
  formatInstalledPower,
  humanizePassportKey,
  siteTypeLabel,
} from "./siteDisplay";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isEmptyValue = (value) =>
  value === null || value === undefined || value === "";

function Scalar({ value }) {
  if (isEmptyValue(value)) {
    return <span className="text-text-faint font-ibmPlexMono">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={`text-[13px] font-medium px-1.5 py-0.5 rounded-[2px] ${
          value ? "text-status-ok bg-status-ok/10" : "text-text-muted bg-white/5"
        }`}
      >
        {value ? "Да" : "Нет"}
      </span>
    );
  }
  return (
    <span className="text-text-primary font-ibmPlexMono break-words">
      {String(value)}
    </span>
  );
}

/**
 * Паспорт — свободный JSON, заранее неизвестной формы, поэтому рисуем его
 * рекурсивно: объект → строки «ключ — значение», массив → пронумерованные
 * блоки (например, несколько инверторов), скаляр → значение. Глубина
 * отступа ограничена цветом рамки, а не отступом: иначе три уровня вложенности
 * съедают половину ширины модалки.
 */
function PassportNode({ value, depth = 0 }) {
  if (Array.isArray(value)) {
    if (!value.length) return <Scalar value={null} />;

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-[2px] border border-surface-border/70 bg-background-dark/40"
          >
            <div className="px-3 py-1.5 border-b border-surface-border/60 text-[12.5px] font-ibmPlexMono text-text-faint">
              #{index + 1}
            </div>
            {isPlainObject(item) || Array.isArray(item) ? (
              <PassportNode value={item} depth={depth + 1} />
            ) : (
              <div className="px-3 py-2 text-[14px]">
                <Scalar value={item} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <Scalar value={null} />;

    return (
      <div>
        {entries.map(([key, child]) => {
          const nested = isPlainObject(child) || Array.isArray(child);
          return (
            <div
              key={key}
              className={`px-3.5 py-2.5 border-b border-surface-border/70 last:border-b-0 ${
                nested ? "" : "flex items-start gap-3"
              }`}
            >
              <span
                className={`text-[14px] text-text-muted ${
                  nested ? "block mb-2" : "w-[38%] flex-shrink-0"
                }`}
              >
                {humanizePassportKey(key)}
              </span>
              {nested ? (
                <PassportNode value={child} depth={depth + 1} />
              ) : (
                <div className="flex-1 min-w-0 text-right text-[14.5px]">
                  <Scalar value={child} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 text-[14.5px]">
      <Scalar value={value} />
    </div>
  );
}

const InfoRow = ({ label, children }) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-surface-border/70 last:border-b-0">
    <span className="w-[38%] flex-shrink-0 text-[14px] text-text-muted truncate">
      {label}
    </span>
    <div className="flex-1 min-w-0 text-right text-[14.5px] text-text-primary font-ibmPlexMono truncate">
      {children}
    </div>
  </div>
);

const SiteDetailsModal = ({ site, deviceCount = 0, onClose }) => {
  if (!site) return null;

  const hasPassport =
    isPlainObject(site.passport) && Object.keys(site.passport).length > 0;

  return (
    <MethodModal
      open
      onClose={onClose}
      closeClick={onClose}
      showCloseIcon
      title={
        <span className="flex items-center gap-2">
          <SolarPowerRounded sx={{ fontSize: 22, color: "#3987e5" }} />
          {site.name}
        </span>
      }
      width={680}
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <section>
          <h4 className="mb-2 text-[13px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
            Основное
          </h4>
          <div className="rounded-[2px] border border-surface-border bg-surface-dark">
            <InfoRow label="Код">{site.code}</InfoRow>
            <InfoRow label="Организация">{site.groupName || "—"}</InfoRow>
            <InfoRow label="Тип">{siteTypeLabel(site.type)}</InfoRow>
            <InfoRow label="Установленная мощность">
              {formatInstalledPower(site.installedPowerKw)}
            </InfoRow>
            <InfoRow label="Устройств привязано">{deviceCount}</InfoRow>
            <InfoRow label="Создана">{formatDateTime(site.createdAt)}</InfoRow>
            <InfoRow label="Обновлена">{formatDateTime(site.updatedAt)}</InfoRow>
            <InfoRow label="ID">
              <span title={site.id}>{site.id}</span>
            </InfoRow>
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-[13px] font-ibmPlexSans font-semibold uppercase tracking-wider text-text-muted">
            Паспорт оборудования
          </h4>
          <div className="rounded-[2px] border border-surface-border bg-surface-dark">
            {hasPassport ? (
              <PassportNode value={site.passport} />
            ) : (
              <p className="px-3.5 py-4 text-[14px] text-text-faint">
                Паспорт не заполнен. Добавьте установки, панели и модели
                инверторов через «Изменить».
              </p>
            )}
          </div>
        </section>
      </div>
    </MethodModal>
  );
};

export default SiteDetailsModal;
