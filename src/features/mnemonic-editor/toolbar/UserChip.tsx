import { useSession } from "next-auth/react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Кто редактирует схему и с какими правами. На операторской смене за одним
 * терминалом работают по очереди — видимый профиль отвечает на вопрос
 * «под чьей учётной записью уйдут изменения» до нажатия «Сохранить».
 */
const UserChip = () => {
  const { data: session } = useSession();
  const user = session?.user as
    | { name?: string; username?: string; roles?: string[]; isAdmin?: boolean }
    | undefined;

  if (!user) return null;

  const displayName = user.name?.trim() || user.username || "Пользователь";
  const role = user.isAdmin ? "Администратор" : user.roles?.[0] || "Оператор";

  return (
    <div
      className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-md border border-slate-800 bg-slate-900/60"
      title={`${displayName} · ${role}`}
    >
      <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-blue-500/15 border border-blue-500/30 text-[10px] font-semibold text-blue-300">
        {initials(displayName)}
      </span>
      <span className="hidden lg:block min-w-0 leading-none">
        <span className="block text-[11px] text-slate-200 truncate max-w-[9rem]">
          {displayName}
        </span>
        <span className="block text-[9px] text-slate-500 truncate max-w-[9rem] mt-0.5">
          {role}
        </span>
      </span>
    </div>
  );
};

export default UserChip;
