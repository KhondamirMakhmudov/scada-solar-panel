import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Close,
  Dashboard,
  ArrowBack,
  ArrowForward,
  Check,
  Whatshot,
  Water,
  ElectricalServices,
  Air,
  DeviceThermostat,
  Add,
  ContentCopy,
} from "@mui/icons-material";

const GROUPS = [
  {
    id: "boiler",
    label: "Котельный цех",
    icon: Whatshot,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  {
    id: "pump",
    label: "Насосная",
    icon: Water,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "elec",
    label: "Электрощитовая",
    icon: ElectricalServices,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  {
    id: "vent",
    label: "Вентиляция",
    icon: Air,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
  },
  {
    id: "heat",
    label: "Теплообменники",
    icon: DeviceThermostat,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
];

const RESOLUTIONS = [
  { label: "1920×1080", sub: "Full HD", w: 1920, h: 1080 },
  { label: "2560×1440", sub: "QHD", w: 2560, h: 1440 },
  { label: "Своё", sub: "Custom", w: null, h: null },
];

const TEMPLATES = [
  { id: "blank", label: "Пустой", icon: Dashboard, desc: "Начать с нуля" },
  {
    id: "copy",
    label: "Копировать",
    icon: ContentCopy,
    desc: "Из существующего",
  },
];

const INTERVALS = ["500 мс", "1 сек", "2 сек", "5 сек"];
const GRIDS = ["Точки (18px)", "Линии (20px)", "Без сетки"];
const MODES = ["Редактор", "Просмотр", "Киоск (fullscreen)"];

const toId = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const StepIndicator = ({ current }) => {
  const steps = ["Основное", "Холст", "Группа"];
  return (
    <div className="flex items-center gap-0 px-5 py-3 border-b border-white/[0.06] bg-gray-950/50">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div
              className={`flex items-center gap-2 text-[11px] ${active ? "text-blue-400" : done ? "text-gray-400" : "text-gray-600"}`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 border
                ${active ? "bg-blue-600 border-blue-600 text-white" : done ? "bg-green-500/20 border-green-500 text-green-400" : "border-white/10"}`}
              >
                {done ? <Check sx={{ fontSize: 11 }} /> : i + 1}
              </div>
              {s}
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px bg-white/[0.06] mx-3" />
            )}
          </div>
        );
      })}
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div className="mb-4">
    <label className="block text-[11px] text-gray-500 mb-1.5 tracking-wide">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-gray-600 mt-1.5">{hint}</p>}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className="w-full bg-gray-800/60 border border-white/[0.08] rounded-lg text-gray-200 text-sm px-3 py-2 outline-none focus:border-blue-500/60 placeholder-gray-600 transition-colors"
  />
);

const Select = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-gray-800/60 border border-white/[0.08] rounded-lg text-gray-200 text-sm px-3 py-2 outline-none focus:border-blue-500/60 transition-colors"
  >
    {options.map((o) => (
      <option key={o} value={o} className="bg-gray-900">
        {o}
      </option>
    ))}
  </select>
);

const Step1 = ({ form, setForm }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    <Field label="Название экрана *">
      <Input
        value={form.name}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            name: e.target.value,
            id: toId(e.target.value),
          }))
        }
        placeholder="Котельный цех — главная"
      />
    </Field>
    <Field
      label="ID экрана"
      hint="Генерируется автоматически. Используется в API и маршрутах."
    >
      <div className="relative">
        <Input
          value={form.id}
          onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
          placeholder="boiler_main_01"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-mono">
          ID
        </span>
      </div>
    </Field>
    <Field label="Описание (необязательно)">
      <textarea
        value={form.desc}
        onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
        placeholder="Краткое описание назначения экрана..."
        rows={2}
        className="w-full bg-gray-800/60 border border-white/[0.08] rounded-lg text-gray-200 text-sm px-3 py-2 outline-none focus:border-blue-500/60 placeholder-gray-600 resize-none transition-colors"
      />
    </Field>
    <Field label="Шаблон">
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setForm((f) => ({ ...f, template: id }))}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
              ${form.template === id ? "border-blue-500/50 bg-blue-500/10" : "border-white/[0.07] bg-gray-800/40 hover:border-white/20"}`}
          >
            <Icon
              sx={{ fontSize: 20 }}
              className={
                form.template === id ? "text-blue-400" : "text-gray-500"
              }
            />
            <div>
              <p
                className={`text-sm font-medium ${form.template === id ? "text-blue-300" : "text-gray-300"}`}
              >
                {label}
              </p>
              <p className="text-[10px] text-gray-600">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </Field>
  </motion.div>
);

const Step2 = ({ form, setForm }) => {
  const customSelected = form.resolution === "Своё";
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Field label="Разрешение экрана">
        <div className="grid grid-cols-3 gap-2">
          {RESOLUTIONS.map(({ label, sub, w, h }) => (
            <button
              key={label}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  resolution: label,
                  width: w || f.width,
                  height: h || f.height,
                }))
              }
              className={`p-2.5 rounded-lg border text-center transition-colors
                ${form.resolution === label ? "border-blue-500/50 bg-blue-500/10" : "border-white/[0.07] bg-gray-800/40 hover:border-white/20"}`}
            >
              <p
                className={`text-xs font-medium ${form.resolution === label ? "text-blue-300" : "text-gray-300"}`}
              >
                {label}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
            </button>
          ))}
        </div>
      </Field>

      {customSelected && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Ширина (px)">
            <Input
              type="number"
              value={form.width}
              onChange={(e) =>
                setForm((f) => ({ ...f, width: e.target.value }))
              }
            />
          </Field>
          <Field label="Высота (px)">
            <Input
              type="number"
              value={form.height}
              onChange={(e) =>
                setForm((f) => ({ ...f, height: e.target.value }))
              }
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Цвет фона">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={form.bgColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, bgColor: e.target.value }))
              }
              className="w-9 h-9 rounded-lg border border-white/[0.08] bg-gray-800/60 cursor-pointer p-0.5"
            />
            <Input
              value={form.bgColor}
              onChange={(e) =>
                setForm((f) => ({ ...f, bgColor: e.target.value }))
              }
            />
          </div>
        </Field>
        <Field label="Сетка холста">
          <Select
            value={form.grid}
            onChange={(v) => setForm((f) => ({ ...f, grid: v }))}
            options={GRIDS}
          />
        </Field>
        <Field label="Интервал опроса">
          <Select
            value={form.interval}
            onChange={(v) => setForm((f) => ({ ...f, interval: v }))}
            options={INTERVALS}
          />
        </Field>
        <Field label="Режим отображения">
          <Select
            value={form.mode}
            onChange={(v) => setForm((f) => ({ ...f, mode: v }))}
            options={MODES}
          />
        </Field>
      </div>
      <p className="text-[10px] text-gray-600 -mt-2">
        Интервал активен только в режиме просмотра.
      </p>
    </motion.div>
  );
};

const Step3 = ({ form, setForm }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    <Field
      label="Выберите группу (цех / зону)"
      hint="Экран будет отображаться в выбранной группе на странице экранов."
    >
      <div className="grid grid-cols-2 gap-2">
        {GROUPS.map(({ id, label, icon: Icon, color, bg, border }) => (
          <button
            key={id}
            onClick={() => setForm((f) => ({ ...f, group: id }))}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
              ${form.group === id ? `${border} ${bg}` : "border-white/[0.07] bg-gray-800/40 hover:border-white/20"}`}
          >
            <Icon
              sx={{ fontSize: 18 }}
              className={form.group === id ? color : "text-gray-600"}
            />
            <span
              className={`text-sm ${form.group === id ? "text-gray-200" : "text-gray-500"}`}
            >
              {label}
            </span>
            {form.group === id && (
              <Check sx={{ fontSize: 14 }} className={`ml-auto ${color}`} />
            )}
          </button>
        ))}
        <button
          onClick={() => setForm((f) => ({ ...f, group: "new" }))}
          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
            ${form.group === "new" ? "border-purple-500/50 bg-purple-500/10" : "border-dashed border-white/[0.07] hover:border-white/20"}`}
        >
          <Add
            sx={{ fontSize: 18 }}
            className={
              form.group === "new" ? "text-purple-400" : "text-gray-600"
            }
          />
          <span
            className={`text-sm ${form.group === "new" ? "text-purple-300" : "text-gray-500"}`}
          >
            Новая группа
          </span>
        </button>
      </div>
    </Field>

    {form.group === "new" && (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Field label="Название новой группы">
          <Input
            value={form.newGroupName}
            onChange={(e) =>
              setForm((f) => ({ ...f, newGroupName: e.target.value }))
            }
            placeholder="Название цеха или зоны"
          />
        </Field>
      </motion.div>
    )}

    <div className="mt-4 rounded-xl border border-white/[0.06] bg-gray-800/30 p-4">
      <p className="text-[11px] text-gray-500 mb-3 uppercase tracking-wide">
        Итог
      </p>
      <div className="space-y-2">
        {[
          ["Название", form.name || "—"],
          ["ID", form.id || "—"],
          [
            "Разрешение",
            form.resolution === "Своё"
              ? `${form.width}×${form.height}`
              : form.resolution,
          ],
          ["Фон", form.bgColor],
          ["Интервал", form.interval],
          [
            "Группа",
            form.group === "new"
              ? form.newGroupName || "Новая группа"
              : GROUPS.find((g) => g.id === form.group)?.label || "—",
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-gray-600">{k}</span>
            <span className="text-gray-300 font-medium font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const INITIAL_FORM = {
  name: "",
  id: "",
  desc: "",
  template: "blank",
  resolution: "1920×1080",
  width: 1920,
  height: 1080,
  bgColor: "#111827",
  grid: "Точки (18px)",
  interval: "1 сек",
  mode: "Редактор",
  group: "boiler",
  newGroupName: "",
};

const CreateScreenModal = ({ open, onClose, onCreate }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);

  if (!open) return null;

  const canNext =
    step === 0
      ? form.name.trim().length > 0
      : step === 1
        ? true
        : form.group !== "" &&
          (form.group !== "new" || form.newGroupName.trim().length > 0);

  const handleCreate = () => {
    onCreate && onCreate(form);
    setStep(0);
    setForm(INITIAL_FORM);
    onClose();
  };

  const handleClose = () => {
    setStep(0);
    setForm(INITIAL_FORM);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-gray-900 border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Dashboard sx={{ fontSize: 16 }} className="text-blue-400" />
                </div>
                <span className="text-white font-medium text-sm">
                  Создать новый экран
                </span>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
              >
                <Close sx={{ fontSize: 15 }} />
              </button>
            </div>

            <StepIndicator current={step} />

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                {step === 0 && <Step1 key="s1" form={form} setForm={setForm} />}
                {step === 1 && <Step2 key="s2" form={form} setForm={setForm} />}
                {step === 2 && <Step3 key="s3" form={form} setForm={setForm} />}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-gray-950/40">
              <span className="text-[11px] text-gray-600">
                Шаг {step + 1} из 3
              </span>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
                  >
                    <ArrowBack sx={{ fontSize: 13 }} /> Назад
                  </button>
                )}
                {step < 2 ? (
                  <button
                    onClick={() => canNext && setStep((s) => s + 1)}
                    disabled={!canNext}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg font-medium transition-colors
                      ${canNext ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
                  >
                    Далее <ArrowForward sx={{ fontSize: 13 }} />
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={!canNext}
                    className={`flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg font-medium transition-colors
                      ${canNext ? "bg-green-600 hover:bg-green-500 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
                  >
                    <Check sx={{ fontSize: 13 }} /> Создать экран
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateScreenModal;
