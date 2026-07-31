import { useRuntimeStore } from "../store/runtimeStore";

const ConnectionStatusBadge = () => {
  const status = useRuntimeStore((state) => state.connectionStatus);

  return (
    <div className="flex items-center gap-1.5 h-6 px-2 rounded-[2px] border border-surface-border bg-background-dark">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          status === "online"
            ? "bg-status-ok animate-pulse"
            : status === "connecting"
              ? "bg-status-warn"
              : "bg-status-fault"
        }`}
      />
      <span
        className={`text-[10px] font-ibmPlexMono font-medium uppercase tracking-wide ${
          status === "online"
            ? "text-status-ok"
            : status === "connecting"
              ? "text-status-warn"
              : "text-status-fault"
        }`}
      >
        {status === "online" ? "Онлайн" : status === "connecting" ? "Подключение..." : "Нет соединения"}
      </span>
    </div>
  );
};

export default ConnectionStatusBadge;
