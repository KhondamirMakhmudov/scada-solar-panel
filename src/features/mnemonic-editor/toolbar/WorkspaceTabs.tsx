import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import {
  DashboardRounded,
  SchemaRounded,
  ShowChartRounded,
  TableChartRounded,
} from "@mui/icons-material";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import {
  WORKSPACE_LABELS,
  WORKSPACE_ORDER,
  workspaceOfKind,
  type Workspace,
} from "../lib/workspace";

const ICONS: Record<Workspace, ReactNode> = {
  all: <DashboardRounded fontSize="small" />,
  scheme: <SchemaRounded fontSize="small" />,
  trends: <ShowChartRounded fontSize="small" />,
  tables: <TableChartRounded fontSize="small" />,
};

const HINTS: Record<Workspace, string> = {
  all: "Все элементы вместе — свободная компоновка экрана",
  scheme: "Только оборудование и провода; тренды и таблицы скрыты",
  trends: "Только тренды; оборудование — бледным фоном для ориентира",
  tables: "Только таблицы данных; оборудование — бледным фоном для ориентира",
};

/**
 * Вкладки рабочих областей редактора: «Всё / Схема / Тренды / Таблицы».
 * Повторяют вкладки режима просмотра, чтобы эксперт собирал каждую часть
 * экрана отдельно, а не разбирал кашу из оборудования, графиков и таблиц на
 * одном холсте. Alt+1…4 — быстрое переключение с клавиатуры.
 */
const WorkspaceTabs = () => {
  const workspace = useUiStore((state) => state.workspace);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const elements = useDocumentStore((state) => state.document.elements);

  const counts = useMemo(() => {
    const result: Record<Workspace, number> = { all: elements.length, scheme: 0, trends: 0, tables: 0 };
    elements.forEach((el) => {
      result[workspaceOfKind(el.type)] += 1;
    });
    return result;
  }, [elements]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      // event.code, а не key: с Alt на части раскладок цифра даёт другой символ
      const index = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(event.code);
      if (index === -1) return;
      event.preventDefault();
      setWorkspace(WORKSPACE_ORDER[index]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setWorkspace]);

  return (
    <div className="flex items-center gap-1 px-4 h-9 border-b border-surface-border bg-surface-dark/40 flex-shrink-0">
      {WORKSPACE_ORDER.map((id, index) => {
        const isActive = workspace === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setWorkspace(id)}
            title={`${HINTS[id]} (Alt+${index + 1})`}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-[14px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/60 ${
              isActive
                ? "bg-blue-500/15 text-blue-300 border border-blue-500/40"
                : "text-text-muted border border-transparent hover:text-text-primary hover:bg-white/[0.03]"
            }`}
          >
            {ICONS[id]}
            {WORKSPACE_LABELS[id]}
            <span
              className={`text-[12.5px] font-ibmPlexMono ${isActive ? "text-blue-300/70" : "text-text-faint"}`}
            >
              {counts[id]}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default WorkspaceTabs;
