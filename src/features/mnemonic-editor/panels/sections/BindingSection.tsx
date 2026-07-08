import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { get } from "lodash";
import useGetQuery from "@/hooks/all/useGetQuery";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import { requestPython } from "@/services/api";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import { useDocumentStore } from "../../store/documentStore";
import { commitImmediate } from "../../store/history/historyActions";
import type { MnemonicElement } from "../../types";

interface Tag {
  id: string;
  name?: string;
  deviceId?: string;
}

interface Device {
  id: string;
  name?: string;
  connectionId?: string;
}

interface Connection {
  id: string;
  name?: string;
}

interface TagGroup {
  key: string;
  label: string;
  tags: Tag[];
}

interface BindingSectionProps {
  element: MnemonicElement;
  screenTagIds?: string[];
}

/** Same device resolution used everywhere a Tag needs to be traced to its owning device. */
function resolveTagDeviceId(tag: Tag): string | null {
  return tag.deviceId || get(tag, "device.id", "") || null;
}

/** Tag picker: binds this shape to a real SCADA tag so it reflects live WebSocket data (see ElementInstance/resolveVisual). Shows only the tags attached to THIS screen (chosen in the create/edit modal), grouped by "connection → device" so identically-named tags from different devices are distinguishable. */
const BindingSection = ({ element, screenTagIds = [] }: BindingSectionProps) => {
  const { data: session } = useSession();
  const updateElement = useDocumentStore((state) => state.updateElement);

  const authHeaders = {
    Authorization: `Bearer ${session?.accessToken}`,
    Accept: "application/json",
  };

  const { data: tagsResp, isLoading } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: authHeaders,
    enabled: Boolean(session?.accessToken),
  });

  const { data: devicesResp } = useGetQuery({
    key: `${KEYS.devices}:binding-tree`,
    url: URLS.devices,
    apiClient: requestPython,
    headers: authHeaders,
    enabled: Boolean(session?.accessToken),
  });

  const { data: connectsResp } = useGetQuery({
    key: `${KEYS.connects}:binding-tree`,
    url: URLS.connects,
    apiClient: requestPython,
    headers: authHeaders,
    enabled: Boolean(session?.accessToken),
  });

  const allTags: Tag[] = useMemo(
    () => get(tagsResp, "data.data", get(tagsResp, "data", [])) || [],
    [tagsResp],
  );

  const devices: Device[] = useMemo(
    () => get(devicesResp, "data.data", get(devicesResp, "data", [])) || [],
    [devicesResp],
  );

  const connections: Connection[] = useMemo(
    () => get(connectsResp, "data.data", get(connectsResp, "data", [])) || [],
    [connectsResp],
  );

  // Показываем только теги, выбранные при создании/редактировании экрана.
  // Если у экрана тегов нет — показываем все, иначе привязка была бы
  // невозможна вовсе.
  const screenHasTags = screenTagIds.length > 0;
  const availableTags = useMemo(() => {
    if (!screenHasTags) return allTags;
    const allowed = new Set(screenTagIds);
    // Уже привязанный тег оставляем в списке, даже если его убрали из
    // экрана — иначе select показал бы пустое значение при живой привязке.
    if (element.dataBinding?.tagId) allowed.add(element.dataBinding.tagId);
    return allTags.filter((tag) => allowed.has(tag.id));
  }, [allTags, screenTagIds, screenHasTags, element.dataBinding?.tagId]);

  const deviceById = useMemo(
    () => new Map(devices.map((dev) => [dev.id, dev])),
    [devices],
  );
  const connNameById = useMemo(
    () => new Map(connections.map((conn) => [conn.id, conn.name || conn.id])),
    [connections],
  );

  // Группировка «Подключение → Устройство» для <optgroup>
  const groups: TagGroup[] = useMemo(() => {
    const byGroup = new Map<string, TagGroup>();

    for (const tag of availableTags) {
      const deviceId = resolveTagDeviceId(tag);
      const device = deviceId ? deviceById.get(deviceId) : null;
      const connId = device?.connectionId || null;

      const connLabel = connId
        ? connNameById.get(connId) || connId
        : "Без подключения";
      const devLabel = device?.name || (deviceId ? deviceId : "Без устройства");

      const key = `${connId || "none"}/${deviceId || "none"}`;
      if (!byGroup.has(key)) {
        byGroup.set(key, { key, label: `${connLabel} → ${devLabel}`, tags: [] });
      }
      byGroup.get(key)!.tags.push(tag);
    }

    return [...byGroup.values()];
  }, [availableTags, deviceById, connNameById]);

  // Устройство основного тега — доп. теги ограничены им же (см. handleChange:
  // при смене основного тега доп. теги другого устройства больше не выбрать
  // заново, но уже сохранённые в документе остаются, пока их не уберут явно
  // кнопкой ниже).
  const primaryTag = element.dataBinding?.tagId
    ? allTags.find((t) => t.id === element.dataBinding!.tagId)
    : undefined;
  const primaryDeviceId = primaryTag ? resolveTagDeviceId(primaryTag) : null;
  const primaryDeviceLabel = primaryDeviceId
    ? deviceById.get(primaryDeviceId)?.name || primaryDeviceId
    : null;

  // Если устройство основного тега не определить, не сужаем список —
  // иначе доп. теги стало бы вообще нечем привязать.
  const extraGroups = useMemo(() => {
    if (!primaryDeviceId) return groups;
    return groups.filter(
      (group) => resolveTagDeviceId(group.tags[0]) === primaryDeviceId,
    );
  }, [groups, primaryDeviceId]);

  const handleChange = (tagId: string) => {
    if (!tagId) {
      commitImmediate(() => updateElement(element.id, { dataBinding: null }));
      return;
    }
    const tag = allTags.find((t) => t.id === tagId);
    // Новый основной тег убираем из дополнительных, чтобы не дублировался
    const extras = (element.extraBindings ?? []).filter(
      (binding) => binding.tagId !== tagId,
    );
    commitImmediate(() =>
      updateElement(element.id, {
        dataBinding: { tagId, tagName: tag?.name ?? null },
        extraBindings: extras.length ? extras : null,
      }),
    );
  };

  const extraBindings = element.extraBindings ?? [];
  const isExtra = (tagId: string) =>
    extraBindings.some((binding) => binding.tagId === tagId);

  const toggleExtra = (tag: Tag) => {
    const next = isExtra(tag.id)
      ? extraBindings.filter((binding) => binding.tagId !== tag.id)
      : [...extraBindings, { tagId: tag.id, tagName: tag.name ?? null }];
    commitImmediate(() =>
      updateElement(element.id, { extraBindings: next.length ? next : null }),
    );
  };

  // Уже сохранённые доп. теги могли быть привязаны до того, как выбор
  // ограничили устройством основного тега (или основной тег с тех пор
  // сменился) — находим их, чтобы предложить явную очистку, а не тихо
  // скрывать проблему.
  const mismatchedExtraIds = primaryDeviceId
    ? extraBindings
        .filter((binding) => {
          const tag = allTags.find((t) => t.id === binding.tagId);
          const deviceId = tag ? resolveTagDeviceId(tag) : null;
          return deviceId !== null && deviceId !== primaryDeviceId;
        })
        .map((binding) => binding.tagId)
    : [];

  const handleRemoveCrossDeviceExtras = () => {
    const cleaned = extraBindings.filter(
      (binding) => !mismatchedExtraIds.includes(binding.tagId),
    );
    commitImmediate(() =>
      updateElement(element.id, { extraBindings: cleaned.length ? cleaned : null }),
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        Привязка к тегу
      </p>
      <select
        value={element.dataBinding?.tagId ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isLoading}
        className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500 disabled:opacity-50"
      >
        <option value="">Без привязки</option>
        {groups.map((group) => (
          <optgroup key={group.key} label={group.label}>
            {group.tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name ? formatTagLabel(tag.name) : tag.id}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {!screenHasTags && (
        <p className="text-[10px] text-amber-400/80">
          У экрана нет выбранных тегов — показаны все. Добавьте теги к экрану
          в разделе «Экраны», чтобы список стал короче.
        </p>
      )}
      {element.dataBinding?.tagId && (
        <p className="text-[10px] text-slate-600">
          Основной тег управляет состоянием элемента в реальном времени.
        </p>
      )}

      {/* Дополнительные теги: каждый — своя строка живого значения под фигурой */}
      {element.dataBinding?.tagId && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 pt-1">
            Доп. теги ({extraBindings.length})
          </p>
          {primaryDeviceLabel && (
            <p className="text-[10px] text-slate-600">
              Показаны только теги устройства «{primaryDeviceLabel}»
            </p>
          )}
          {mismatchedExtraIds.length > 0 && (
            <div className="rounded-md border border-amber-700/50 bg-amber-500/10 px-2 py-1.5 space-y-1.5">
              <p className="text-[10px] text-amber-400">
                ⚠ {mismatchedExtraIds.length} доп.{" "}
                {mismatchedExtraIds.length === 1 ? "тег принадлежит" : "тега принадлежат"}{" "}
                другому устройству
              </p>
              <button
                type="button"
                onClick={handleRemoveCrossDeviceExtras}
                className="text-[10px] px-2 py-1 rounded border border-amber-600/50 text-amber-300 hover:bg-amber-500/10 transition-colors"
              >
                Убрать теги других устройств
              </button>
            </div>
          )}
          <div className="max-h-40 overflow-y-auto rounded-md border border-slate-700/60 bg-slate-800/40">
            {extraGroups.map((group) => {
              const selectable = group.tags.filter(
                (tag) => tag.id !== element.dataBinding?.tagId,
              );
              if (!selectable.length) return null;
              return (
                <div key={group.key}>
                  <p className="px-2 pt-1.5 pb-0.5 text-[9px] uppercase tracking-wide text-slate-600 truncate">
                    {group.label}
                  </p>
                  {selectable.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isExtra(tag.id)}
                        onChange={() => toggleExtra(tag)}
                        className="cursor-pointer"
                      />
                      <span className="truncate">
                        {tag.name ? formatTagLabel(tag.name) : tag.id}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600">
            Каждый выбранный тег показывается отдельной строкой под элементом.
          </p>
        </div>
      )}
    </div>
  );
};

export default BindingSection;
