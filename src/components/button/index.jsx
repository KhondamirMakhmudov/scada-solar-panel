import { Button } from "@mui/material";

const PrimaryButton = ({
  children,
  onClick,
  variant,
  backgroundColor = "#6E39CB",
  color = "white",
  type,
  disabled,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      sx={{
        textTransform: "initial",
        fontFamily: "Manrope",
        backgroundColor: backgroundColor,
        boxShadow: "none",
        color: color,
        display: "flex",
        gap: "4px",
        fontSize: "14px",
        borderRadius: "8px",
        paddingY: "8px",
        paddingX: "20px",
      }}
      variant={variant}
      type={type}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
