// layouts/DashboardLayout.tsx
import Sidebar from "@/components/dashboard/sidebar";
import Head from "next/head";
import MainContentHeader from "@/components/dashboard/mainContentHeader";
import { useState } from "react";
export default function DashboardLayout({ children, headerTitle }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };
  return (
    <div className="flex w-full h-screen bg-[#131313] text-[#e5e2e1]">
      <Head>
        <title>{`${headerTitle || ""} | SCADA`}</title>
      </Head>

      <Sidebar isOpen={isSidebarOpen} />

      <main className="flex-1 p-6  overflow-auto bg-[#0e0e0e]">
        <MainContentHeader
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        >
          {headerTitle}
        </MainContentHeader>
        {children}
      </main>
    </div>
  );
}
