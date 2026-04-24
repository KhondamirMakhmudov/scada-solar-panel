import { useMemo, useState } from "react";
import { get } from "lodash";
import { KEYS } from "@/constants/key";
import { URLS } from "@/constants/url";
import useGetQuery from "@/hooks/all/useGetQuery";
import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import ContentLoader from "@/components/loader";
import NoData from "@/components/no-data";
import CustomTable from "@/components/table";
import MethodModal from "@/components/modal/method-modal";
import { Button } from "@mui/material";
import {
  GridView,
  TableRows,
  VisibilityOutlined,
  Lan,
  Usb,
  ElectricBoltOutlined,
  Schedule,
} from "@mui/icons-material";

const Index = () => {
  const [activeTab, setActiveTab] = useState("table");
  const [selectedConnection, setSelectedConnection] = useState(null);

  const { data: connects, isLoading: isLoadingConnects } = useGetQuery({
    key: KEYS.connects,
    url: URLS.connects,
  });

  const connections = get(connects, "data.data", []);
  const total = get(connects, "data.pagination.total", connections.length);

  const columns = useMemo(
    () => [
      {
        header: "№",
        cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "name",
        header: "Название",
        cell: ({ row }) => (
          <div className="font-semibold text-white">{row.original.name}</div>
        ),
      },
      {
        accessorKey: "type",
        header: "Тип",
        cell: ({ row }) => (
          <span className="inline-flex px-2 py-1 rounded-md text-xs border border-primary/60 bg-primary/20 text-blue-200">
            {row.original.type}
          </span>
        ),
      },
      {
        accessorKey: "driverId",
        header: "ID драйвера",
      },
      {
        accessorKey: "enabled",
        header: "Статус",
        cell: ({ row }) => (
          <span
            className={`inline-flex px-2 py-1 rounded-md text-xs border ${
              row.original.enabled
                ? "border-green-500 bg-green-500/20 text-green-300"
                : "border-slate-500 bg-slate-500/20 text-slate-300"
            }`}
          >
            {row.original.enabled ? "Включен" : "Отключен"}
          </span>
        ),
      },
      {
        accessorKey: "params.host",
        header: "Хост",
        cell: ({ row }) => get(row.original, "params.host", "-") || "-",
      },
      {
        accessorKey: "params.port",
        header: "Порт",
        cell: ({ row }) => get(row.original, "params.port", "-") || "-",
      },
      {
        accessorKey: "actions",
        header: "Детали",
        cell: ({ row }) => (
          <Button
            onClick={() => setSelectedConnection(row.original)}
            sx={{
              width: "36px",
              height: "36px",
              minWidth: "36px",
              borderRadius: "10px",
              border: "1px solid #385272",
              background: "#1f2a37",
              color: "#bfdbfe",
              "&:hover": {
                background: "#26364a",
                borderColor: "#4f78a8",
              },
            }}
          >
            <VisibilityOutlined fontSize="small" />
          </Button>
        ),
      },
    ],
    [],
  );

  if (isLoadingConnects) {
    return (
      <DashboardLayout headerTitle={"Подключения"}>
        <ContentLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle={"Подключения"}>
      <div className="flex items-center justify-between my-[15px] gap-3 flex-wrap font-mono">
        <div>
          <h2 className="text-lg font-semibold">Обзор подключений</h2>
          <p className="text-sm text-slate-400">
            Всего подключений:{" "}
            <span className="text-white font-medium">{total}</span>
          </p>
        </div>

        <div className="relative flex items-center bg-[#1f2a37] border border-[#304156] p-[6px] rounded-2xl shadow-sm">
          <button
            onClick={() => setActiveTab("table")}
            className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
              activeTab === "table"
                ? "text-white bg-primary/25 border border-primary/50 rounded-xl"
                : "text-white/60 hover:text-white/80"
            }`}
            title="Табличный вид"
          >
            <TableRows fontSize="small" />
          </button>

          <button
            onClick={() => setActiveTab("card")}
            className={`z-10 flex items-center justify-center w-12 h-10 rounded-xl transition-all ${
              activeTab === "card"
                ? "text-white bg-primary/25 border border-primary/50 rounded-xl"
                : "text-white/60 hover:text-white/80"
            }`}
            title="Карточный вид"
          >
            <GridView fontSize="small" />
          </button>
        </div>
      </div>

      {!connections.length ? (
        <NoData
          title="Подключения не найдены"
          description="Пока нет SCADA-подключений. Добавьте подключение, чтобы начать мониторинг."
        />
      ) : (
        <>
          {activeTab === "table" && (
            <CustomTable columns={columns} data={connections} />
          )}

          {activeTab === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-mono">
              {connections.map((connection) => {
                const isTcp = connection?.type?.includes("TCP");
                return (
                  <div
                    key={connection.id}
                    className="rounded-2xl bg-[#171b22] border border-[#2d3848] p-4 shadow-sm hover:shadow-lg hover:border-[#3f5f84] transition-all duration-200"
                  >
                    <div className="h-1 w-full rounded-full bg-primary/50 mb-4" />

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-semibold tracking-wide">
                          {connection.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Драйвер: {connection.driverId}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 rounded-md text-xs border ${
                          connection.enabled
                            ? "border-green-500 bg-green-500/20 text-green-300"
                            : "border-slate-500 bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {connection.enabled ? "Включен" : "Отключен"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-8 h-8 rounded-lg bg-[#253347] border border-[#334c68] flex items-center justify-center text-[#9EC5FF]">
                        {isTcp ? (
                          <Lan fontSize="small" />
                        ) : (
                          <Usb fontSize="small" />
                        )}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-md bg-primary/20 text-blue-200 border border-primary/60">
                        {connection.type}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-md bg-slate-700/40 text-slate-200 border border-slate-600">
                        ID: {connection.id?.slice(0, 8)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-300">
                      <p>
                        Хост:{" "}
                        <span className="text-white">
                          {get(connection, "params.host", "-")}
                        </span>
                      </p>
                      <p>
                        Порт:{" "}
                        <span className="text-white">
                          {get(connection, "params.port", "-")}
                        </span>
                      </p>
                      <p>
                        Таймаут:{" "}
                        <span className="text-white">
                          {get(connection, "params.timeout_ms", "-")} ms
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={() => setSelectedConnection(connection)}
                        sx={{
                          textTransform: "none",
                          color: "#bfdbfe",
                          borderColor: "#426080",
                          background: "#1b2633",
                          "&:hover": {
                            background: "#223246",
                            borderColor: "#5a82b0",
                          },
                        }}
                        variant="outlined"
                        startIcon={<VisibilityOutlined fontSize="small" />}
                      >
                        Показать детали
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedConnection && (
        <MethodModal
          open={!!selectedConnection}
          onClose={() => setSelectedConnection(null)}
          closeClick={() => setSelectedConnection(null)}
          showCloseIcon={true}
          title={"Детали подключения"}
          width={700}
        >
          <div className="mb-4 p-4 rounded-xl border border-[#334155] bg-[#111827]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center text-blue-200">
                  {selectedConnection?.type?.includes("TCP") ? (
                    <Lan fontSize="small" />
                  ) : (
                    <Usb fontSize="small" />
                  )}
                </span>
                <div>
                  <p className="text-white text-base font-semibold">
                    {selectedConnection.name}
                  </p>
                  <p className="text-slate-400 text-xs">
                    ID: {selectedConnection.id}
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs border ${
                  selectedConnection.enabled
                    ? "border-green-500 bg-green-500/20 text-green-300"
                    : "border-slate-500 bg-slate-500/20 text-slate-300"
                }`}
              >
                {selectedConnection.enabled ? "Включен" : "Отключен"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Название</p>
              <p className="text-white font-medium">
                {selectedConnection.name}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Тип</p>
              <p className="text-white font-medium">
                {selectedConnection.type}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">ID драйвера</p>
              <p className="text-white font-medium">
                {selectedConnection.driverId}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Статус</p>
              <p className="text-white font-medium">
                {selectedConnection.enabled ? "Включен" : "Отключен"}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Хост</p>
              <p className="text-white font-medium">
                {get(selectedConnection, "params.host", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Порт</p>
              <p className="text-white font-medium">
                {get(selectedConnection, "params.port", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Таймаут</p>
              <p className="text-white font-medium flex items-center gap-2">
                <Schedule fontSize="inherit" className="text-slate-400" />
                {get(selectedConnection, "params.timeout_ms", "-")} ms
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Протокол</p>
              <p className="text-white font-medium flex items-center gap-2">
                <ElectricBoltOutlined
                  fontSize="inherit"
                  className="text-amber-300"
                />
                {get(selectedConnection, "params.type", "-")}
              </p>
            </div>
            <div className="bg-[#111827] rounded-lg p-3 border border-[#2f3848]">
              <p className="text-slate-400">Создано</p>
              <p className="text-white font-medium">
                {selectedConnection.createdAt
                  ? new Date(selectedConnection.createdAt).toLocaleString()
                  : "-"}
              </p>
            </div>
          </div>
        </MethodModal>
      )}
    </DashboardLayout>
  );
};

export default Index;
