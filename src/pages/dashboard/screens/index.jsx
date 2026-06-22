import DashboardLayout from "@/layouts/dashboard/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dashboard,
  Add,
  Search,
  Folder,
  Edit,
  Visibility,
  Delete,
  MoreVert,
  Whatshot,
  Water,
  ElectricalServices,
  Air,
  DeviceThermostat,
  CheckCircle,
  Circle,
} from "@mui/icons-material";
import CreateScreenModal from "@/components/create-screen";

const SCREENS_DATA = [
  {
    group: "Котельный цех",
    groupId: "boiler",
    groupIcon: Whatshot,
    groupColor: "text-red-400",
    groupBg: "bg-red-500/10",
    screens: [
      {
        id: "boiler_main_01",
        name: "Главная мнемосхема",
        widgetCount: 6,
        resolution: "1920×1080",
        status: "active",
        updatedAt: "2ч назад",
        previewColor: "from-red-900/20 to-red-950/30",
        previewBorder: "border-red-500/20",
        widgetColor: "border-red-500/30 bg-red-500/10",
        iconColor: "text-red-400",
      },
      {
        id: "boiler_trends_01",
        name: "Тренды температур",
        widgetCount: 3,
        resolution: "1920×1080",
        status: "draft",
        updatedAt: "1д назад",
        previewColor: "from-red-900/20 to-red-950/30",
        previewBorder: "border-red-500/20",
        widgetColor: "border-red-500/30 bg-red-500/10",
        iconColor: "text-red-400",
      },
    ],
  },
  {
    group: "Насосная станция",
    groupId: "pump",
    groupIcon: Water,
    groupColor: "text-blue-400",
    groupBg: "bg-blue-500/10",
    screens: [
      {
        id: "pump_pipeline_02",
        name: "Схема трубопровода",
        widgetCount: 4,
        resolution: "1920×1080",
        status: "active",
        updatedAt: "3ч назад",
        previewColor: "from-blue-900/20 to-blue-950/30",
        previewBorder: "border-blue-500/20",
        widgetColor: "border-blue-500/30 bg-blue-500/10",
        iconColor: "text-blue-400",
      },
      {
        id: "pump_pressure_02",
        name: "Давление сети",
        widgetCount: 2,
        resolution: "1920×1080",
        status: "active",
        updatedAt: "5ч назад",
        previewColor: "from-blue-900/20 to-blue-950/30",
        previewBorder: "border-blue-500/20",
        widgetColor: "border-blue-500/30 bg-blue-500/10",
        iconColor: "text-blue-400",
      },
    ],
  },
  {
    group: "Электрощитовая",
    groupId: "elec",
    groupIcon: ElectricalServices,
    groupColor: "text-yellow-400",
    groupBg: "bg-yellow-500/10",
    screens: [
      {
        id: "elec_panel_01",
        name: "Главный щит",
        widgetCount: 2,
        resolution: "1920×1080",
        status: "draft",
        updatedAt: "2д назад",
        previewColor: "from-yellow-900/20 to-yellow-950/30",
        previewBorder: "border-yellow-500/20",
        widgetColor: "border-yellow-500/30 bg-yellow-500/10",
        iconColor: "text-yellow-400",
      },
    ],
  },
];

const GROUP_META = {
  boiler: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    previewColor: "from-red-900/20 to-red-950/30",
    previewBorder: "border-red-500/20",
    widgetColor: "border-red-500/30 bg-red-500/10",
    iconColor: "text-red-400",
  },
  pump: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    previewColor: "from-blue-900/20 to-blue-950/30",
    previewBorder: "border-blue-500/20",
    widgetColor: "border-blue-500/30 bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  elec: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    previewColor: "from-yellow-900/20 to-yellow-950/30",
    previewBorder: "border-yellow-500/20",
    widgetColor: "border-yellow-500/30 bg-yellow-500/10",
    iconColor: "text-yellow-400",
  },
  vent: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    previewColor: "from-green-900/20 to-green-950/30",
    previewBorder: "border-green-500/20",
    widgetColor: "border-green-500/30 bg-green-500/10",
    iconColor: "text-green-400",
  },
  heat: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    previewColor: "from-orange-900/20 to-orange-950/30",
    previewBorder: "border-orange-500/20",
    widgetColor: "border-orange-500/30 bg-orange-500/10",
    iconColor: "text-orange-400",
  },
};

const GROUP_ICONS = {
  boiler: Whatshot,
  pump: Water,
  elec: ElectricalServices,
  vent: Air,
  heat: DeviceThermostat,
};

const PREVIEW_ICONS = [Dashboard, Water, DeviceThermostat, Air];

const ScreenCard = ({ screen, delay }) => {
  const Icons = PREVIEW_ICONS.slice(0, Math.min(screen.widgetCount, 4));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-600/70 transition-all group cursor-pointer"
    >
      <div
        className={`h-24 bg-gradient-to-br ${screen.previewColor} border-b ${screen.previewBorder} relative overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {Icons.map((Icon, i) => (
          <div
            key={i}
            className={`absolute border rounded-md flex items-center justify-center ${screen.widgetColor}`}
            style={{
              left: `${14 + i * 30}%`,
              top: i % 2 === 0 ? "18%" : "35%",
              width: 36,
              height: i % 2 === 0 ? 36 : 44,
            }}
          >
            <Icon sx={{ fontSize: 14 }} className={screen.iconColor} />
          </div>
        ))}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button className="w-6 h-6 bg-gray-900/80 rounded flex items-center justify-center hover:bg-gray-800">
            <Edit sx={{ fontSize: 12 }} className="text-gray-300" />
          </button>
          <button className="w-6 h-6 bg-gray-900/80 rounded flex items-center justify-center hover:bg-gray-800">
            <Visibility sx={{ fontSize: 12 }} className="text-gray-300" />
          </button>
          <button className="w-6 h-6 bg-gray-900/80 rounded flex items-center justify-center hover:bg-gray-800">
            <MoreVert sx={{ fontSize: 12 }} className="text-gray-300" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-medium mb-1 truncate">
          {screen.name}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">
            {screen.widgetCount} виджетов · {screen.resolution}
          </span>
          {screen.status === "active" ? (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle sx={{ fontSize: 11 }} />
              Активен
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <Circle sx={{ fontSize: 11 }} />
              Черновик
            </span>
          )}
        </div>
        <p className="text-gray-600 text-xs mt-1">Изм. {screen.updatedAt}</p>
      </div>
    </motion.div>
  );
};

const AddCard = ({ delay, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35 }}
    onClick={onClick}
    className="border border-dashed border-gray-700/60 rounded-xl h-[154px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
  >
    <div className="w-8 h-8 rounded-lg bg-gray-700/50 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
      <Add
        sx={{ fontSize: 18 }}
        className="text-gray-500 group-hover:text-blue-400"
      />
    </div>
    <span className="text-gray-600 group-hover:text-gray-400 text-xs transition-colors">
      Добавить экран
    </span>
  </motion.div>
);

const Index = () => {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [screenGroups, setScreenGroups] = useState(SCREENS_DATA);

  const totalScreens = screenGroups.reduce(
    (acc, g) => acc + g.screens.length,
    0,
  );
  const activeScreens = screenGroups.reduce(
    (acc, g) => acc + g.screens.filter((s) => s.status === "active").length,
    0,
  );

  const handleCreate = (form) => {
    const meta = GROUP_META[form.group] || GROUP_META.boiler;
    const GroupIcon = GROUP_ICONS[form.group] || Dashboard;
    const newScreen = {
      id: form.id || `screen_${Date.now()}`,
      name: form.name,
      widgetCount: 0,
      resolution:
        form.resolution === "Своё"
          ? `${form.width}×${form.height}`
          : form.resolution,
      status: "draft",
      updatedAt: "только что",
      ...meta,
    };

    setScreenGroups((prev) => {
      const existing = prev.find((g) => g.groupId === form.group);
      if (existing) {
        return prev.map((g) =>
          g.groupId === form.group
            ? { ...g, screens: [...g.screens, newScreen] }
            : g,
        );
      }
      return [
        ...prev,
        {
          group: form.newGroupName || "Новая группа",
          groupId: form.group,
          groupIcon: GroupIcon,
          groupColor: meta.color,
          groupBg: meta.bg,
          screens: [newScreen],
        },
      ];
    });
  };

  const filtered = search.trim()
    ? screenGroups
        .map((g) => ({
          ...g,
          screens: g.screens.filter((s) =>
            s.name.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((g) => g.screens.length > 0)
    : screenGroups;

  return (
    <DashboardLayout headerTitle={"Экраны"}>
      <div className="font-manrope py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Экраны мнемосхем
            </h2>
            <p className="text-gray-400 text-sm">
              {totalScreens} экранов · {activeScreens} активных
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                sx={{ fontSize: 16 }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск экранов..."
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50 w-52 transition-colors"
              />
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Add sx={{ fontSize: 18 }} />
              Новый экран
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Всего экранов",
              value: totalScreens,
              color: "text-blue-400",
            },
            {
              label: "Активных",
              value: activeScreens,
              color: "text-green-400",
            },
            {
              label: "Черновиков",
              value: totalScreens - activeScreens,
              color: "text-yellow-400",
            },
            {
              label: "Групп",
              value: screenGroups.length,
              color: "text-purple-400",
            },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
              className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
            >
              <p className="text-gray-400 text-xs mb-1">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            </motion.div>
          ))}
        </div>

        {filtered.map((group, gi) => {
          const GroupIcon = group.groupIcon;
          const baseDelay = 0.3 + gi * 0.1;
          return (
            <motion.div
              key={group.groupId || group.group}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + gi * 0.1, duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-7 h-7 rounded-lg ${group.groupBg} flex items-center justify-center`}
                >
                  <GroupIcon
                    sx={{ fontSize: 15 }}
                    className={group.groupColor}
                  />
                </div>
                <h3 className="text-white font-semibold text-base">
                  {group.group}
                </h3>
                <span className="text-gray-600 text-sm">
                  {group.screens.length} экр.
                </span>
                <div className="flex-1 h-px bg-gray-700/40 ml-1" />
                <button className="flex items-center gap-1 text-gray-600 hover:text-gray-400 text-xs transition-colors">
                  <Folder sx={{ fontSize: 13 }} /> Управление группой
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.screens.map((screen, si) => (
                  <ScreenCard
                    key={screen.id}
                    screen={screen}
                    delay={baseDelay + si * 0.05}
                  />
                ))}
                <AddCard
                  delay={baseDelay + group.screens.length * 0.05}
                  onClick={() => setModalOpen(true)}
                />
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-gray-600"
          >
            <Dashboard sx={{ fontSize: 40 }} className="mb-3 opacity-30" />
            <p className="text-sm">Экраны не найдены</p>
          </motion.div>
        )}
      </div>

      <CreateScreenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </DashboardLayout>
  );
};

export default Index;
