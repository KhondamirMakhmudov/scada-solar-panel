"use client";
import {
  Person,
  Shield,
  Place,
  CalendarToday,
  Delete,
} from "@mui/icons-material";
import { Button } from "@mui/material";

export default function UserCard({ user, setSelectUser, setDeleteModal }) {
  const isAdmin = user.role === "admin";

  return (
    <div
      className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-md transition-transform duration-300 transform hover:scale-[1.02] font-[Manrope] ${
        isAdmin
          ? "bg-gradient-to-br from-[#6E39CB] to-[#512DA8] text-white"
          : "bg-gray-50 dark:bg-gray-900 dark:text-gray-100 text-gray-800"
      }`}
    >
      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mr-3 ${
              isAdmin ? "bg-white/20" : "bg-[#6E39CB]"
            }`}
          >
            <Person sx={{ fontSize: 30, color: "#fff" }} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold capitalize">
              {user.first_name} {user.last_name}
            </h2>
            <p
              className={`text-sm ${
                isAdmin ? "text-gray-200" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              @{user.username}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
              <Shield sx={{ fontSize: 18, color: "#fff" }} />
              Админ
            </div>
          )}
        </div>

        {/* Company Info */}
        <div
          className={`rounded-xl p-3 mb-3 flex-1 ${
            user.company_info
              ? isAdmin
                ? "bg-white/15"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              : "bg-gray-100/40 dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-700"
          }`}
        >
          {user.company_info ? (
            <>
              <p className="text-sm font-semibold mb-2">
                {user.company_info.name}
              </p>
              <div className="flex items-center mb-1">
                <Place
                  sx={{
                    fontSize: 18,
                    color: isAdmin ? "#D1C4E9" : "#6B7280",
                    marginRight: "6px",
                  }}
                />
                <p className="text-sm">{user.company_info.address}</p>
              </div>
              <div className="flex items-center">
                <CalendarToday
                  sx={{
                    fontSize: 16,
                    color: isAdmin ? "#D1C4E9" : "#6B7280",
                    marginRight: "6px",
                  }}
                />
                <p className="text-sm">
                  Создан:{" "}
                  {new Date(user.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </>
          ) : (
            <p className="italic text-gray-600 text-sm">
              Информация о компании отсутствует
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          <p
            className={`text-sm ${
              isAdmin ? "text-gray-200" : "text-gray-600 dark:text-gray-400"
            }`}
          >
            Роль:{" "}
            <span
              className={`font-semibold ${
                isAdmin ? "text-yellow-200" : "text-[#6E39CB]"
              }`}
            >
              {isAdmin ? "Админ" : "Пользователь"}
            </span>
          </p>

          {/* Delete button only for User */}
          {!isAdmin && (
            <div className="flex justify-start items-center gap-2">
              <Button
                onClick={() => {
                  setSelectUser(user?.id);
                  setDeleteModal(true);
                }}
                sx={{
                  width: "32px",
                  height: "32px",
                  minWidth: "32px",
                  background: "#FCD8D3",
                  color: "#FF1E00",
                  "&:hover": {
                    background: "#ffcdc7",
                  },
                }}
              >
                <Delete fontSize="small" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
