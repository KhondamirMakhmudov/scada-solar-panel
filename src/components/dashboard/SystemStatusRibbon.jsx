import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetPythonQuery from "@/hooks/python/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { STATUS_COLOR, deriveGroupStatus } from "@/constants/statusPalette";

const Metric = ({ label, active, total }) => {
  const status = deriveGroupStatus(active, total);
  const color = STATUS_COLOR[status];

  return (
    <div
      className="flex items-center gap-1.5 h-6 px-2 rounded-[2px] border border-surface-border bg-background-dark flex-shrink-0"
      title={`${label}: ${active} из ${total} активны`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          backgroundColor: color,
          // Пульсирует только аварийное состояние: постоянное мерцание
          // «всё в норме» приучает не замечать движение в ленте
          animation: status === "alarm" ? "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" : undefined,
        }}
      />
      <span className="text-[10.5px] font-ibmPlexMono text-text-faint">{label}</span>
      <span className="text-[10.5px] font-ibmPlexMono tabular-nums" style={{ color }}>
        {active}/{total}
      </span>
    </div>
  );
};

/**
 * Живая сводка по системе в шапке — соединения, устройства и параметры видны
 * на любой странице, а не только на «Главной». Оператор, настраивающий теги,
 * замечает отвалившееся соединение, не переключая раздел.
 *
 * Запрос идёт по тому же ключу React Query, что и на «Главной»
 * (KEYS.systemOverview), поэтому одновременный показ ленты и сводки не
 * порождает второй сетевой запрос.
 */
const SystemStatusRibbon = () => {
  const { data: session } = useSession();

  const { data: systemOverview, isLoading } = useGetPythonQuery({
    key: KEYS.systemOverview,
    url: URLS.systemOverview,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: !!session?.accessToken,
  });

  if (isLoading || !systemOverview) return null;

  const data = get(systemOverview, "data.data", {});
  const connections = get(data, "connections", {});
  const devices = get(data, "devices", {});
  const tags = get(data, "tags", {});

  const tagsTotal = tags.total || 0;

  return (
    <div className="flex items-center gap-4">
      <Metric
        label="Соединения"
        active={connections.enabled || 0}
        total={connections.total || 0}
      />
      <Metric label="Устройства" active={devices.enabled || 0} total={devices.total || 0} />
      <Metric
        label="Параметры"
        active={tagsTotal - (tags.disabled || 0)}
        total={tagsTotal}
      />
    </div>
  );
};

export default SystemStatusRibbon;
