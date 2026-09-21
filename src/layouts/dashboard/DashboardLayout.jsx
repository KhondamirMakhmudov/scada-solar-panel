import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import TopNavBar from "@/components/dashboard/TopNavBar";
import Sidebar from "@/components/dashboard/Sidebar";
import MainContentHeader from "@/components/dashboard/mainContentHeader";

/**
 * Оболочка раздела дашборда: тонкая верхняя панель (организация/сводка/
 * поиск/профиль) над рядом «боковое меню + прокручиваемый контент». Список
 * разделов живёт в `Sidebar.jsx` — обычная навигация по реальным
 * Next.js-маршрутам, поэтому ролевой доступ (`routeAccess.js`) и прямые
 * ссылки работают как прежде.
 *
 * `actions` — слот под кнопки конкретной страницы (создать, обновить,
 * экспортировать) в шапке раздела.
 *
 * Контент оборачивается в короткий fade — единственное место, где
 * анимируется переход между разделами: раньше смена вкладки была жёстким
 * покадровым срезом. `key={pathname}` пересоздаёт обёртку при переходе,
 * заново запуская анимацию; без exit-фазы, чтобы не задерживать переход.
 */
export default function DashboardLayout({ children, headerTitle, actions }) {
  const router = useRouter();

  return (
    <div className="flex flex-col w-full h-screen bg-background-dark text-text-primary">
      <Head>
        <title>{`${headerTitle || ""} | SCADA`}</title>
      </Head>

      <TopNavBar />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 min-w-0 p-2.5 overflow-auto bg-background-dark">
          <MainContentHeader actions={actions}>{headerTitle}</MainContentHeader>
          <motion.div
            key={router.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
