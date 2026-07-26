import { useEffect } from "react";
import Head from "next/head";
import Sidebar from "@/components/dashboard/sidebar";
import MainContentHeader from "@/components/dashboard/mainContentHeader";
import { useShellStore } from "@/store/shellStore";

/**
 * Оболочка раздела дашборда. Свёрнутость меню держится в useShellStore, а не
 * в локальном состоянии: каждая страница монтирует свой экземпляр этого
 * компонента, поэтому локальный стейт сбрасывался при каждом переходе и
 * свёрнутое меню разворачивалось обратно.
 *
 * `actions` — слот под кнопки конкретной страницы (создать, обновить,
 * экспортировать) в верхнем ярусе шапки, рядом с поиском.
 */
export default function DashboardLayout({ children, headerTitle, actions }) {
  const isSidebarOpen = useShellStore((state) => state.isSidebarOpen);
  const toggleSidebar = useShellStore((state) => state.toggleSidebar);
  const hydrateFromStorage = useShellStore((state) => state.hydrateFromStorage);

  // После монтирования, а не при создании стора: на сервере localStorage нет,
  // и чтение при инициализации разошлось бы с серверной разметкой
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <div className="flex w-full h-screen bg-[#131313] text-[#e5e2e1]">
      <Head>
        <title>{`${headerTitle || ""} | SCADA`}</title>
      </Head>

      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 min-w-0 p-6 overflow-auto bg-[#0e0e0e]">
        <MainContentHeader
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          actions={actions}
        >
          {headerTitle}
        </MainContentHeader>
        {children}
      </main>
    </div>
  );
}
