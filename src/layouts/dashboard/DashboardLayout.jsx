import Head from "next/head";
import TopNavBar from "@/components/dashboard/TopNavBar";
import MainContentHeader from "@/components/dashboard/mainContentHeader";

/**
 * Оболочка раздела дашборда: верхняя панель (организация/сводка/профиль +
 * вкладки разделов) над единой прокручиваемой областью контента — без
 * бокового меню. Вкладки в TopNavBar — обычная навигация по реальным
 * Next.js-маршрутам, поэтому ролевой доступ (`routeAccess.js`) и прямые
 * ссылки работают как прежде.
 *
 * `actions` — слот под кнопки конкретной страницы (создать, обновить,
 * экспортировать) в шапке раздела.
 */
export default function DashboardLayout({ children, headerTitle, actions }) {
  return (
    <div className="flex flex-col w-full h-screen bg-background-dark text-text-primary">
      <Head>
        <title>{`${headerTitle || ""} | SCADA`}</title>
      </Head>

      <TopNavBar />

      <main className="flex-1 min-w-0 p-6 overflow-auto bg-[#0e0e0e]">
        <MainContentHeader actions={actions}>{headerTitle}</MainContentHeader>
        {children}
      </main>
    </div>
  );
}
