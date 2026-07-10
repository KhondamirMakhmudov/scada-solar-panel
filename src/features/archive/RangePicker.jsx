import CustomSelect from "@/components/select";
import Input from "@/components/input";
import { RANGE_PRESETS } from "./constants";

/** Period selector: preset buttons + custom "from/to" datetime inputs when "Свой период" is picked. */
const RangePicker = ({ range, onRangeChange, customFrom, customTo, onCustomFromChange, onCustomToChange }) => (
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
    {range === "custom" && (
      <div className="flex flex-wrap gap-3">
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
    )}
  </div>
);

export default RangePicker;
