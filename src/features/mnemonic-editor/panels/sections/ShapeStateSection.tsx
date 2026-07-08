import { useRef } from "react";
import toast from "react-hot-toast";
import { useDocumentStore } from "../../store/documentStore";
import { commitImmediate } from "../../store/history/historyActions";
import { readImageFile } from "../../lib/imageFile";
import type { MnemonicElement, ShapeKind } from "../../types";
import { TREND_RANGE_META, type TrendRange } from "../../hooks/useTagTrend";
import RangeField from "../fields/RangeField";
import NumberField from "../fields/NumberField";
import TextField from "../fields/TextField";

interface ShapeStateSectionProps {
  element: MnemonicElement;
}

const BOOLEAN_STATE_FIELD: Partial<Record<ShapeKind, { key: string; label: string }>> = {
  pump: { key: "running", label: "Работает" },
  valve: { key: "open", label: "Открыт" },
  motor: { key: "running", label: "Работает" },
  breaker: { key: "closed", label: "Замкнут" },
  switch: { key: "on", label: "Включён" },
  transformer: { key: "energized", label: "Под напряжением" },
  solarPanel: { key: "generating", label: "Генерирует" },
  grid: { key: "connected", label: "Подключено" },
};

const INVERTER_STATUSES = [
  { value: "running", label: "Работает" },
  { value: "standby", label: "Ожидание" },
  { value: "fault", label: "Авария" },
];

const PIPE_VARIANTS = [
  { value: "straight", label: "Прямая" },
  { value: "angled", label: "Угловая" },
  { value: "tee", label: "Тройник" },
];

const SENSOR_TYPES = [
  { value: "temperature", label: "Температура" },
  { value: "pressure", label: "Давление" },
  { value: "flow", label: "Расход" },
  { value: "level", label: "Уровень" },
];

const LAMP_COLORS = [
  { value: "green", label: "Зелёный" },
  { value: "red", label: "Красный" },
  { value: "yellow", label: "Жёлтый" },
];

const SectionHeading = () => (
  <p className="text-[11px] uppercase tracking-wide text-slate-500">Состояние</p>
);

const BoundNote = () => (
  <p className="text-[10px] text-slate-600">
    Значение определяется привязанным тегом.
  </p>
);

/** Shape-specific toggles/sliders/selects, one branch per kind. When a tag is bound, the live-derived field is disabled to avoid fighting the incoming value (see resolveVisual.ts for which field that is per kind). */
const ShapeStateSection = ({ element }: ShapeStateSectionProps) => {
  const updateElement = useDocumentStore((state) => state.updateElement);
  const isBound = Boolean(element.dataBinding?.tagId);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const setState = (patch: Record<string, unknown>) =>
    updateElement(element.id, { state: { ...element.state, ...patch } });

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const { src } = await readImageFile(file);
      commitImmediate(() => setState({ src }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки изображения");
    }
  };

  if (element.type === "image") {
    const hasImage = Boolean(element.state?.src);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="w-full flex items-center justify-center px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-sm text-slate-200 hover:border-blue-500/50 hover:bg-blue-500/10 transition-colors"
        >
          {hasImage ? "Заменить изображение" : "Загрузить изображение"}
        </button>
      </div>
    );
  }

  if (element.type === "text") {
    const text = String(element.state?.text ?? "Текст");
    const fontSize = Number(element.state?.fontSize ?? 16);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <TextField label="Содержимое" value={text} onChange={(v) => setState({ text: v })} />
        <NumberField label="Размер шрифта" value={fontSize} onChange={(v) => setState({ fontSize: Math.max(8, v) })} />
      </div>
    );
  }

  if (element.type === "chart") {
    const range = (element.state?.range as TrendRange) ?? "1h";
    return (
      <div className="space-y-2">
        <SectionHeading />
        <select
          value={range}
          onChange={(event) => commitImmediate(() => setState({ range: event.target.value }))}
          className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
        >
          {Object.entries(TREND_RANGE_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-600">
          Теги для графика выбираются ниже, в разделе «Привязка к тегу»
          (основной тег + доп. теги) — каждый рисуется отдельной линией.
        </p>
      </div>
    );
  }

  if (element.type === "tank") {
    const level = Number(element.state?.level ?? 0.5);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <fieldset disabled={isBound} className="disabled:opacity-40">
          <RangeField
            label="Уровень"
            value={Math.round(level * 100)}
            onChange={(v) => setState({ level: v / 100 })}
          />
        </fieldset>
        {isBound && <BoundNote />}
      </div>
    );
  }

  if (element.type === "battery") {
    const charge = Number(element.state?.charge ?? 0.6);
    const charging = Boolean(element.state?.charging);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <fieldset disabled={isBound} className="disabled:opacity-40">
          <RangeField
            label="Заряд"
            value={Math.round(charge * 100)}
            onChange={(v) => setState({ charge: v / 100 })}
          />
        </fieldset>
        <button
          type="button"
          onClick={() => commitImmediate(() => setState({ charging: !charging }))}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
            charging
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-slate-700 bg-slate-800/60 text-slate-400"
          }`}
        >
          Заряжается
          <span>{charging ? "Да" : "Нет"}</span>
        </button>
        {isBound && <BoundNote />}
      </div>
    );
  }

  if (element.type === "inverter") {
    const status = String(element.state?.status ?? "running");
    return (
      <div className="space-y-2">
        <SectionHeading />
        <fieldset disabled={isBound} className="disabled:opacity-40">
          <select
            value={status}
            onChange={(event) => commitImmediate(() => setState({ status: event.target.value }))}
            className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            {INVERTER_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </fieldset>
        {isBound && <BoundNote />}
      </div>
    );
  }

  if (element.type === "gauge") {
    const value = Number(element.state?.value ?? 0);
    const min = Number(element.state?.min ?? 0);
    const max = Number(element.state?.max ?? 100);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <fieldset disabled={isBound} className="disabled:opacity-40 col-span-2">
            <NumberField label="Значение" value={value} onChange={(v) => setState({ value: v })} />
          </fieldset>
          <NumberField label="Мин" value={min} onChange={(v) => setState({ min: v })} />
          <NumberField label="Макс" value={max} onChange={(v) => setState({ max: v })} />
        </div>
        {isBound && <BoundNote />}
      </div>
    );
  }

  if (element.type === "lamp") {
    const color = String(element.state?.color ?? "green");
    const blinking = Boolean(element.state?.blinking);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <fieldset disabled={isBound} className="disabled:opacity-40 space-y-2">
          <select
            value={color}
            onChange={(event) => commitImmediate(() => setState({ color: event.target.value }))}
            className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
          >
            {LAMP_COLORS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </fieldset>
        <button
          type="button"
          onClick={() => commitImmediate(() => setState({ blinking: !blinking }))}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
            blinking
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-slate-700 bg-slate-800/60 text-slate-400"
          }`}
        >
          Мигание (авария)
          <span>{blinking ? "Да" : "Нет"}</span>
        </button>
        {isBound && <BoundNote />}
      </div>
    );
  }

  if (element.type === "sensor") {
    const sensorType = String(element.state?.sensorType ?? "temperature");
    return (
      <div className="space-y-2">
        <SectionHeading />
        <select
          value={sensorType}
          onChange={(event) => commitImmediate(() => setState({ sensorType: event.target.value }))}
          className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
        >
          {SENSOR_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (element.type === "pipe") {
    const variant = String(element.state?.variant ?? "straight");
    const flowing = Boolean(element.state?.flowing);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <select
          value={variant}
          onChange={(event) => commitImmediate(() => setState({ variant: event.target.value }))}
          className="w-full h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-slate-100 outline-none focus:border-blue-500"
        >
          {PIPE_VARIANTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <fieldset disabled={isBound} className="disabled:opacity-40">
          <button
            type="button"
            onClick={() => commitImmediate(() => setState({ flowing: !flowing }))}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
              flowing
                ? "border-green-500/50 bg-green-500/10 text-green-300"
                : "border-slate-700 bg-slate-800/60 text-slate-400"
            }`}
          >
            Поток
            <span>{flowing ? "Да" : "Нет"}</span>
          </button>
        </fieldset>
        {isBound && <BoundNote />}
      </div>
    );
  }

  const booleanField = BOOLEAN_STATE_FIELD[element.type];
  if (booleanField) {
    const active = Boolean(element.state?.[booleanField.key]);
    return (
      <div className="space-y-2">
        <SectionHeading />
        <button
          type="button"
          disabled={isBound}
          onClick={() => commitImmediate(() => setState({ [booleanField.key]: !active }))}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            active
              ? "border-green-500/50 bg-green-500/10 text-green-300"
              : "border-slate-700 bg-slate-800/60 text-slate-400"
          }`}
        >
          {booleanField.label}
          <span>{active ? "Да" : "Нет"}</span>
        </button>
        {isBound && <BoundNote />}
      </div>
    );
  }

  return null;
};

export default ShapeStateSection;
