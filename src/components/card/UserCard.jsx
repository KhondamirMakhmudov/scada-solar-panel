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
      className={`w-full max-w-sm rounded-[2px] overflow-hidden border transition-colors font-ibmPlexSans ${
        isAdmin
          ? "bg-primary/[0.08] border-primary/30 text-text-primary"
          : "bg-surface-dark border-surface-border text-text-primary hover:border-surface-border-hover"
      }`}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div
            className={`w-11 h-11 rounded-[2px] flex items-center justify-center mr-3 flex-shrink-0 ${
              isAdmin ? "bg-primary/25" : "bg-background-dark border border-surface-border"
            }`}
          >
            <Person sx={{ fontSize: 22, color: isAdmin ? "#93c5fd" : "#7c8290" }} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold capitalize truncate">
              {user.first_name} {user.last_name}
            </h2>
            <p className="text-[11px] font-ibmPlexMono text-text-muted truncate">
              @{user.username}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/15 border border-primary/30 rounded-[2px] text-[10px] font-ibmPlexMono uppercase tracking-wide text-primary flex-shrink-0">
              <Shield sx={{ fontSize: 13 }} />
              Админ
            </div>
          )}
        </div>

        {/* Company Info */}
        <div
          className={`rounded-[2px] p-3 mb-3 flex-1 ${
            user.company_info
              ? "bg-background-dark border border-surface-border text-text-secondary"
              : "bg-background-dark/40 border border-dashed border-surface-border"
          }`}
        >
          {user.company_info ? (
            <>
              <p className="text-[12px] font-semibold mb-2 text-text-primary">
                {user.company_info.name}
              </p>
              <div className="flex items-center mb-1">
                <Place sx={{ fontSize: 15, color: "#7c8290", marginRight: "6px" }} />
                <p className="text-[11px] font-ibmPlexMono">{user.company_info.address}</p>
              </div>
              <div className="flex items-center">
                <CalendarToday sx={{ fontSize: 14, color: "#7c8290", marginRight: "6px" }} />
                <p className="text-[11px] font-ibmPlexMono">
                  Создан: {new Date(user.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
            </>
          ) : (
            <p className="italic text-text-faint text-[11px]">
              Информация о компании отсутствует
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          <p className="text-[11px] font-ibmPlexMono text-text-muted">
            Роль:{" "}
            <span className={`font-semibold ${isAdmin ? "text-primary" : "text-text-secondary"}`}>
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
                  width: "28px",
                  height: "28px",
                  minWidth: "28px",
                  background: "#7f1d1d",
                  color: "#fca5a5",
                  "&:hover": {
                    background: "#991b1b",
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
