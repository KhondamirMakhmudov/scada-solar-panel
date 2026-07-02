import { Button, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { ReactNode } from "react";

interface ActionButtonProps {
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
}

interface PrimaryButtonProps extends ActionButtonProps {
  label?: string;
}

type ButtonGroupAlign = "start" | "center" | "end";

interface ActionButtonGroupProps {
  children: ReactNode;
  align?: ButtonGroupAlign;
  gap?: number;
}

export const EyeButton = ({
  onClick,
  tooltip = "Осмотреть",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#0c4a6e", // bg-blue-900/30 - 0c4a6e
            color: disabled ? "#8a8a8a" : "#0284c7", // text-blue-600 - 0284c7
            // border border-blue-600
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#075985", // to'g'ri hover rang
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <VisibilityIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Edit Button Component
export const EditButton = ({
  onClick,
  tooltip = "Изменить",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#7c2d12",
            color: disabled ? "#8a8a8a" : "#fb923c",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#9a3412",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <EditIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Delete Button Component
export const DeleteButton = ({
  onClick,
  tooltip = "Удалить",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#7f1d1d",
            color: disabled ? "#8a8a8a" : "#fca5a5",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#991b1b",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// View Button Component
export const ViewButton = ({
  onClick,
  tooltip = "Просмотр",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#0c4a6e",
            color: disabled ? "#8a8a8a" : "#7dd3fc",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#075985",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <VisibilityIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Add Button Component
export const AddButton = ({
  onClick,
  tooltip = "Добавить",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#14532d",
            color: disabled ? "#8a8a8a" : "#4ade80",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#166534",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <AddIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Add Button Component
export const PrimaryButton = ({
  onClick,
  tooltip = "Добавить",
  label = "Добавить",
  disabled = false,
}: PrimaryButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "auto",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#14532d",
            color: disabled ? "#8a8a8a" : "#4ade80",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#166534",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
};

// Diagram/Editor Button Component — "open the visual editor" for an item (currently: mnemonic screens)
export const DiagramButton = ({
  onClick,
  tooltip = "Открыть схему",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#312e81",
            color: disabled ? "#8a8a8a" : "#a5b4fc",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#3730a3",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <AccountTreeIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Preview/Runtime Button Component — "open the live/running view" for an item
export const PreviewButton = ({
  onClick,
  tooltip = "Открыть",
  disabled = false,
}: ActionButtonProps) => {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          onClick={onClick}
          disabled={disabled}
          sx={{
            width: "32px",
            height: "32px",
            minWidth: "32px",
            background: disabled ? "#4a4a4a" : "#064e3b",
            color: disabled ? "#8a8a8a" : "#34d399",
            "&:hover": {
              background: disabled ? "#4a4a4a" : "#065f46",
            },
            "&:disabled": {
              cursor: "not-allowed",
            },
          }}
        >
          <PlayArrowIcon fontSize="small" />
        </Button>
      </span>
    </Tooltip>
  );
};

// Action Buttons Group Component
export const ActionButtonGroup = ({
  children,
  align = "start", // "start", "center", "end"
  gap = 2,
}: ActionButtonGroupProps) => {
  const alignmentClass: Record<ButtonGroupAlign, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  };

  return (
    <div
      className={`flex items-center ${alignmentClass[align]}`}
      style={{ gap: `${gap * 0.25}rem` }}
    >
      {children}
    </div>
  );
};
