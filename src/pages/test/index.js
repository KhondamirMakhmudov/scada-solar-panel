"use client";

import { signOut } from "next-auth/react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@mui/material";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white text-xl">Загрузка...</p>
      </div>
    );
  }

  if (session?.error === "RefreshAccessTokenError") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Сессия истекла</p>
          <p className="text-gray-400">Перенаправление на страницу входа...</p>
        </div>
      </div>
    );
  }

  console.log(session?.error, "session");

  return (
    <div className="p-8 min-h-screen bg-[#0F0A1E]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Панель управления</h1>
          <p className="text-gray-400 mt-2">
            Добро пожаловать, {session?.user?.name}!
          </p>
        </div>

        <Button
          onClick={handleSignOut}
          sx={{
            backgroundColor: "#6E39CB",
            color: "#FFFFFF",
            height: "40px",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "15px",
            fontWeight: "600",
            px: 3,
            "&:hover": {
              backgroundColor: "#A877FD",
            },
          }}
        >
          Выйти
        </Button>
      </div>

      {/* Your dashboard content here */}
      <div className="text-white">
        <p>Содержимое панели мониторинга солнечных панелей</p>

        {/* Display token info for debugging */}
        <div className="mt-8 p-4 bg-[#1A132A] rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Информация о сессии:</h3>
          <p className="text-sm text-gray-400">
            Пользователь: {session?.user?.name}
          </p>
          <p className="text-sm text-gray-400">
            Токен доступа: {session?.accessToken ? "Активен" : "Отсутствует"}
          </p>
        </div>
      </div>
    </div>
  );
}
