import type { ShapeKind } from "../types";

/**
 * Рабочие области редактора — те же «Схема / Тренды / Таблицы», что и вкладки
 * режима просмотра (RuntimePage), плюс «Всё» для свободной компоновки.
 * Область — это только *фильтр отображения*: в документе ничего не меняется,
 * поэтому сохранённая схема и режим просмотра от неё не зависят.
 */
export type Workspace = "all" | "scheme" | "trends" | "tables";

export type WorkspaceView = Exclude<Workspace, "all">;

/** Как элемент выглядит в выбранной области: обычно / бледным фоном без взаимодействия / скрыт. */
export type WorkspaceVisibility = "active" | "ghost" | "hidden";

export function workspaceOfKind(kind: ShapeKind): WorkspaceView {
  if (kind === "chart") return "trends";
  if (kind === "dataTable") return "tables";
  return "scheme";
}

/**
 * Правило: оборудование схемы в чужой области остаётся бледным фоном — чтобы
 * при размещении тренда было видно, рядом с чем он ляжет, — а тяжёлые виджеты
 * данных (график/таблица) скрываются целиком: именно они и превращали общий
 * холст в кашу.
 */
export function getWorkspaceVisibility(kind: ShapeKind, workspace: Workspace): WorkspaceVisibility {
  if (workspace === "all") return "active";
  const own = workspaceOfKind(kind);
  if (own === workspace) return "active";
  return own === "scheme" ? "ghost" : "hidden";
}

export const WORKSPACE_LABELS: Record<Workspace, string> = {
  all: "Всё",
  scheme: "Схема",
  trends: "Тренды",
  tables: "Таблицы",
};

/** Порядок и «горячие» цифры для Alt+1…4. */
export const WORKSPACE_ORDER: Workspace[] = ["all", "scheme", "trends", "tables"];
