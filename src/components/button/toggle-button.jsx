import { Tooltip } from "@mui/material";

const ToggleButton = ({ enabled, onClick, tooltip }) => {
  return (
    <Tooltip title={tooltip}>
      <button
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          enabled ? "bg-primary" : "bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </Tooltip>
  );
};

export default ToggleButton;
