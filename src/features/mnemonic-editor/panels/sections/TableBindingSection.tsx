import { useMemo, useState } from "react";
import { formatTagLabel } from "@/lib/tagNameTranslation";
import { useDocumentStore } from "../../store/documentStore";
import { commitImmediate } from "../../store/history/historyActions";
import { useTagCatalog, NO_CONNECTION_LABEL, NO_DEVICE_LABEL, type CatalogTag } from "../../hooks/useTagCatalog";
import { DATA_TABLE_MAX_TAGS } from "../../shapes/DataTable";
import type { DataBinding, MnemonicElement } from "../../types";

interface TableBindingSectionProps {
  element: MnemonicElement;
  screenTagIds?: string[];
}

interface DeviceNode {
  key: string;
  name: string;
  tags: CatalogTag[];
}

interface ConnectionNode {
  key: string;
  name: string;
  devices: DeviceNode[];
}

function tagLabel(tag: CatalogTag): string {
  return tag.name ? formatTagLabel(tag.name) : tag.id;
}

/**
 * Выбор тегов для «Таблицы данных». В отличие от BindingSection (тег + доп.
 * теги одного устройства) здесь можно набирать теги со ВСЕХ подключений и
 * устройств сразу: дерево «подключение → устройство → тег», поиск, отметка
 * целого устройства одним кликом. В самой таблице теги потом раскладываются
 * по вкладкам-устройствам, так что широкий набор остаётся читаемым.
 *
 * Хранение то же, что у остальных фигур: первый тег — dataBinding, остальные —
 * extraBindings, поэтому схема документа и сохранённые экраны не меняются.
 */
const TableBindingSection = ({ element, screenTagIds = [] }: TableBindingSectionProps) => {
  const updateElement = useDocumentStore((state) => state.updateElement);
  const { tags, placementByTagId, isLoading } = useTagCatalog();

  const [query, setQuery] = useState("");
  const [openDevices, setOpenDevices] = useState<string[]>([]);

  const bound: DataBinding[] = useMemo(() => {
    const list: DataBinding[] = [];
    if (element.dataBinding?.tagId) list.push(element.dataBinding);
    (element.extraBindings ?? []).forEach((b) => {
      if (b?.tagId) list.push(b);
    });
    return list;
  }, [element.dataBinding, element.extraBindings]);
  const selectedIds = useMemo(() => new Set(bound.map((b) => b.tagId)), [bound]);

  // Как в BindingSection: если у экрана заданы теги — предлагаем только их (и
  // уже выбранные), иначе список был бы каталогом всей системы
  const availableTags = useMemo(() => {
    if (screenTagIds.length === 0) return tags;
    const allowed = new Set([...screenTagIds, ...selectedIds]);
    return tags.filter((tag) => allowed.has(tag.id));
  }, [tags, screenTagIds, selectedIds]);

  const normalizedQuery = query.trim().toLowerCase();

  const tree: ConnectionNode[] = useMemo(() => {
    const connMap = new Map<string, ConnectionNode>();
    availableTags.forEach((tag) => {
      const placement = placementByTagId.get(tag.id);
      const connKey = placement?.connectionId ?? "none";
      const connName = placement?.connectionName ?? NO_CONNECTION_LABEL;
      const devKey = placement?.deviceId ?? "none";
      const devName = placement?.deviceName ?? NO_DEVICE_LABEL;

      if (normalizedQuery) {
        const haystack = `${tag.name ?? ""} ${tagLabel(tag)} ${devName} ${connName}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return;
      }

      if (!connMap.has(connKey)) connMap.set(connKey, { key: connKey, name: connName, devices: [] });
      const conn = connMap.get(connKey)!;
      let device = conn.devices.find((d) => d.key === devKey);
      if (!device) {
        device = { key: devKey, name: devName, tags: [] };
        conn.devices.push(device);
      }
      device.tags.push(tag);
    });
    return [...connMap.values()];
  }, [availableTags, placementByTagId, normalizedQuery]);

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const apply = (ids: string[]) => {
    const limited = ids.slice(0, DATA_TABLE_MAX_TAGS);
    const list: DataBinding[] = limited.map((id) => ({
      tagId: id,
      tagName: tagById.get(id)?.name ?? bound.find((b) => b.tagId === id)?.tagName ?? null,
    }));
    commitImmediate(() =>
      updateElement(element.id, {
        dataBinding: list[0] ?? null,
        extraBindings: list.length > 1 ? list.slice(1) : null,
      }),
    );
  };

  const currentIds = bound.map((b) => b.tagId);

  const toggleTag = (tagId: string) => {
    apply(selectedIds.has(tagId) ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId]);
  };

  const toggleDevice = (device: DeviceNode) => {
    const deviceIds = device.tags.map((t) => t.id);
    const allSelected = deviceIds.every((id) => selectedIds.has(id));
    apply(
      allSelected
        ? currentIds.filter((id) => !deviceIds.includes(id))
        : [...currentIds, ...deviceIds.filter((id) => !selectedIds.has(id))],
    );
  };

  const toggleOpen = (deviceKey: string) =>
    setOpenDevices((open) =>
      open.includes(deviceKey) ? open.filter((k) => k !== deviceKey) : [...open, deviceKey],
    );

  const isAtLimit = bound.length >= DATA_TABLE_MAX_TAGS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-secondary">
          Выбрано:{" "}
          <span className="font-ibmPlexMono text-text-primary">
            {bound.length}/{DATA_TABLE_MAX_TAGS}
          </span>
        </p>
        {bound.length > 0 && (
          <button
            type="button"
            onClick={() => apply([])}
            className="text-[13px] px-2 py-0.5 rounded-[8px] border border-surface-border text-text-muted hover:text-rose-300 hover:border-rose-900/60 active:scale-95 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60"
          >
            Очистить
          </button>
        )}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск: тег, устройство, подключение"
        className="w-full h-8 px-2 rounded-[8px] bg-background-dark border border-surface-border focus:border-blue-500/60 focus:outline-none text-xs text-text-primary placeholder:text-text-faint transition-colors"
      />

      <div className="max-h-72 overflow-y-auto rounded-[8px] border border-surface-border/60 bg-background-dark/40">
        {isLoading && <p className="px-2 py-4 text-center text-[13px] text-text-faint">Загрузка тегов…</p>}
        {!isLoading && tree.length === 0 && (
          <p className="px-2 py-4 text-center text-[13px] text-text-faint">
            {normalizedQuery ? `Ничего не найдено по «${query.trim()}»` : "Нет доступных тегов"}
          </p>
        )}

        {tree.map((conn) => (
          <div key={conn.key}>
            <p className="sticky top-0 z-10 px-2 py-1 text-[12px] uppercase tracking-wide text-text-faint bg-surface-dark/95 border-b border-surface-border/40 truncate">
              {conn.name}
            </p>
            {conn.devices.map((device) => {
              const deviceKey = `${conn.key}/${device.key}`;
              const selectedCount = device.tags.filter((t) => selectedIds.has(t.id)).length;
              const isOpen = Boolean(normalizedQuery) || openDevices.includes(deviceKey);
              const allSelected = selectedCount === device.tags.length;

              return (
                <div key={deviceKey}>
                  <div className="flex items-center gap-1.5 px-2 py-1 hover:bg-surface-border/30">
                    <button
                      type="button"
                      onClick={() => toggleOpen(deviceKey)}
                      title={isOpen ? "Свернуть" : "Развернуть"}
                      className="w-4 h-4 flex items-center justify-center text-[11.5px] text-text-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 rounded-[8px]"
                    >
                      <span style={{ display: "inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                        ▶
                      </span>
                    </button>
                    <input
                      type="checkbox"
                      checked={allSelected && device.tags.length > 0}
                      ref={(node) => {
                        if (node) node.indeterminate = selectedCount > 0 && !allSelected;
                      }}
                      onChange={() => toggleDevice(device)}
                      title="Выбрать все теги устройства"
                      className="cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => toggleOpen(deviceKey)}
                      className="flex-1 min-w-0 text-left text-xs text-text-primary truncate focus-visible:outline-none"
                    >
                      {device.name}
                    </button>
                    <span
                      className={`text-[12.5px] font-ibmPlexMono ${selectedCount > 0 ? "text-blue-300" : "text-text-faint"}`}
                    >
                      {selectedCount}/{device.tags.length}
                    </span>
                  </div>

                  {isOpen &&
                    device.tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center gap-2 pl-8 pr-2 py-1 text-xs text-text-secondary hover:bg-surface-border/40 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          className="cursor-pointer"
                        />
                        <span className="truncate">{tagLabel(tag)}</span>
                      </label>
                    ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {isAtLimit && (
        <p className="text-[12.5px] text-amber-400/80">
          Достигнут предел в {DATA_TABLE_MAX_TAGS} тегов — уберите лишние, чтобы добавить другие.
        </p>
      )}
      <p className="text-[12.5px] text-text-faint">
        В таблице теги раскладываются по вкладкам — по одной на устройство, плюс общая «Все».
      </p>
    </div>
  );
};

export default TableBindingSection;
