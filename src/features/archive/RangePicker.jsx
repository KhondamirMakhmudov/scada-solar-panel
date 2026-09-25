import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { RANGE_PRESETS } from "./constants";

/**
 * Выбор периода: готовые интервалы плюс поля «с/по», когда выбран свой период.
 *
 * Два вида, потому что мест применения два и они разной ширины. `buttons` —
 * пресеты кнопками в одну строку: на странице архива период переключают чаще
 * всего, и раскрывать ради этого список из девяти пунктов — лишний клик на
 * каждое движение. `select` — прежний выпадающий список для узкой боковой
 * панели рантайма мнемосхемы, где девять кнопок развалились бы на три строки
 * и вытеснили сами графики.
 */
const RangePicker = ({
  range,
  onRangeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  variant = "select",
}) => {
  const customInputs = range === "custom" && (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        label="С"
        type="datetime-local"
        name="customFrom"
        value={customFrom}
        onChange={(e) => onCustomFromChange(e.target.value)}
      />
      <Input
        label="По"
        type="datetime-local"
        name="customTo"
        value={customTo}
        onChange={(e) => onCustomToChange(e.target.value)}
      />
    </div>
  );

  if (variant === "buttons") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex flex-wrap rounded-[8px] border border-surface-border bg-surface-1 p-0.5">
          {RANGE_PRESETS.map((preset) => {
            const isActive = preset.value === range;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onRangeChange(preset.value)}
                aria-pressed={isActive}
                className={`h-8 px-2.5 rounded-[8px] text-[13px] whitespace-nowrap transition-colors active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1 ${
                  isActive
                    ? "bg-primary/20 text-[#93c5fd] hover:bg-primary/30"
                    : "text-[#6b7280] hover:text-[#e5e2e1] hover:bg-surface-2"
                }`}
              >
                {preset.value === "custom" ? "Свой" : preset.label}
              </button>
            );
          })}
        </div>
        {customInputs}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-60">
        <CustomSelect
          label="Период"
          options={RANGE_PRESETS.map((p) => ({ label: p.label, value: p.value }))}
          value={range}
          onChange={onRangeChange}
          sortOptions={false}
        />
      </div>
      {customInputs}
    </div>
  );
};

export default RangePicker;
