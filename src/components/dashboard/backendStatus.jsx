import { useQuery } from "@tanstack/react-query";
import { requestScreens } from "@/services/api";
import { URLS } from "@/constants/url";
import { KEYS } from "@/constants/key";

// Polls /health + /ready (see FRONTEND_INTEGRATION.md) so the dashboard shell
// can show backend reachability independent of any single page's WebSocket.
function useBackendHealth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: [KEYS.ready],
    queryFn: () => requestScreens.get(URLS.ready),
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  if (isLoading) return { state: "loading" };
  if (isError) return { state: "unreachable" };

  const status = data?.data?.status;
  const database = data?.data?.database;
  if (status === "ok" && database === "ok") return { state: "ok" };
  return { state: "degraded" };
}

const STYLES = {
  loading: { dot: "bg-slate-500 animate-pulse", text: "text-slate-500", label: "ПРОВЕРКА…" },
  ok: { dot: "bg-emerald-400", text: "text-emerald-400", label: "БЭКЕНД OK" },
  degraded: { dot: "bg-amber-400 animate-pulse", text: "text-amber-400", label: "БЭКЕНД DEGRADED" },
  unreachable: { dot: "bg-rose-400", text: "text-rose-400", label: "БЭКЕНД НЕДОСТУПЕН" },
};

const BackendStatusIndicator = () => {
  const { state } = useBackendHealth();
  const s = STYLES[state];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a2a] bg-[#1c1b1b]">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-[11px] font-semibold tracking-wide ${s.text}`}>
        {s.label}
      </span>
    </div>
  );
};

export default BackendStatusIndicator;
