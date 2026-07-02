import { useRuntimeStore } from "../store/runtimeStore";

const ConnectionStatusBadge = () => {
  const status = useRuntimeStore((state) => state.connectionStatus);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          status === "online"
            ? "bg-green-400 animate-pulse"
            : status === "connecting"
              ? "bg-yellow-400"
              : "bg-red-500"
        }`}
      />
      <span className="text-slate-400">
        {status === "online" ? "Онлайн" : status === "connecting" ? "Подключение..." : "Нет соединения"}
      </span>
    </div>
  );
};

export default ConnectionStatusBadge;
