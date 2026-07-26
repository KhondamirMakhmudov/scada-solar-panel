import { create } from "zustand";

const STORAGE_KEY = "scada:shell:sidebarOpen";

interface ShellStoreState {
  isSidebarOpen: boolean;
  /** Прочитано ли сохранённое значение — до этого рендерим значение по умолчанию */
  isHydrated: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  hydrateFromStorage: () => void;
}

/**
 * Состояние оболочки дашборда (пока — только свёрнутость бокового меню).
 *
 * Живёт в сторе, а не в useState внутри DashboardLayout, потому что каждая
 * страница монтирует свой экземпляр DashboardLayout: при переходе между
 * разделами локальный стейт пересоздавался и свёрнутое меню разворачивалось
 * обратно. Модульный синглтон переживает клиентскую навигацию.
 *
 * Чтение localStorage вынесено в отдельное действие и вызывается из эффекта
 * после монтирования: сделать это при инициализации стора нельзя — на сервере
 * localStorage нет, и разметка разошлась бы с клиентской при гидратации.
 */
export const useShellStore = create<ShellStoreState>((set) => ({
  isSidebarOpen: true,
  isHydrated: false,

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarOpen;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Приватный режим / отключённое хранилище — предпочтение просто не переживёт перезагрузку
      }
      return { isSidebarOpen: next };
    }),

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  hydrateFromStorage: () =>
    set((state) => {
      if (state.isHydrated) return state;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return {
          isHydrated: true,
          isSidebarOpen: stored === null ? state.isSidebarOpen : stored === "1",
        };
      } catch {
        return { isHydrated: true };
      }
    }),
}));
