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
}

interface BindingSectionProps {
  element: MnemonicElement;
}

/** Tag picker: binds this shape to a real SCADA tag so it reflects live WebSocket data (see ElementInstance/resolveVisual). Reuses the same tags query as the Tags/Devices pages elsewhere in the app. */
const BindingSection = ({ element }: BindingSectionProps) => {
  const { data: session } = useSession();
  const updateElement = useDocumentStore((state) => state.updateElement);

  const { data: tagsResp, isLoading } = useGetQuery({
    key: KEYS.tags,
    url: URLS.tags,
    apiClient: requestPython,
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      Accept: "application/json",
    },
    enabled: Boolean(session?.accessToken),
  });

  const tags: Tag[] = useMemo(
    () => get(tagsResp, "data.data", get(tagsResp, "data", [])) || [],
    [tagsResp],
  );

  const handleChange = (tagId: string) => {
    if (!tagId) {
      commitImmediate(() => updateElement(element.id, { dataBinding: null }));
      return;
    }
    const tag = tags.find((t) => t.id === tagId);
    commitImmediate(() =>
      updateElement(element.id, {
        dataBinding: { tagId, tagName: tag?.name ?? null },
      }),
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
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name ? formatTagLabel(tag.name) : tag.id}
          </option>
        ))}
      </select>
      {element.dataBinding?.tagId && (
        <p className="text-[10px] text-slate-600">
          Значение тега управляет состоянием элемента в реальном времени.
        </p>
      )}
    </div>
  );
};

export default BindingSection;
