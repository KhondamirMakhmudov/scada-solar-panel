import { createTheme } from "@mui/material/styles";

// Единая тёмная тема MUI под индустриальный дизайн SCADA-панели: плотная
// типографика IBM Plex, острые углы (2px), тонкие однопиксельные рамки.
// Оверрайды покрывают только базовый вид компонентов — точечные `sx` на
// местах по-прежнему выигрывают поверх темы.
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#3b82f6" },
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    background: { default: "#131313", paper: "#1c1b1b" },
    text: { primary: "#e5e2e1", secondary: "#7c8290" },
    divider: "#2a2a2a",
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: "'IBM Plex Sans', sans-serif",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1c1b1b",
          border: "1px solid #2a2a2a",
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        root: {
          fontFamily: "'IBM Plex Sans', sans-serif",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        thumb: { boxShadow: "none" },
        track: { backgroundColor: "#2a2a2a", opacity: 1 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1c1b1b",
          border: "1px solid #2a2a2a",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontFamily: "'IBM Plex Mono', monospace",
        },
      },
    },
  },
});

export default theme;
