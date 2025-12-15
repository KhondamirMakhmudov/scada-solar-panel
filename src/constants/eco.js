// src/constants/eco.js

export const ECOLOGY_PARAMS = {
  AbsolutePressure_mbar_10sec: {
    title: "Абсолютное давление",
    unit: "мбар",
    max: 1100,
    order: 1,
    type: "physical",
  },
  Temperature_C_10sec: {
    title: "Температура",
    unit: "°C",
    max: 150,
    order: 2,
    type: "physical",
  },
  "Velocity_m--s_10sec": {
    title: "Скорость потока",
    unit: "м/с",
    max: 50,
    order: 3,
    type: "physical",
  },
  "Flow_m3--h_1Min": {
    title: "Расход",
    unit: "м³/ч",
    max: 50000,
    order: 4,
    type: "physical",
  },
  "O2_%_10sec": {
    title: "O₂ — Кислород",
    unit: "%",
    max: 25,
    order: 5,
    danger: { green: 19, yellow: 16, red: 0 },
  },
  "CO2_%_10sec": {
    title: "CO₂ — Углекислый газ",
    unit: "%",
    max: 10,
    order: 6,
    danger: { green: 0, yellow: 1, red: 3 },
  },
  "TOZ_mg--m3_10sec": {
    title: "ТОЗ — Твердые частицы (Пыль)",
    unit: "мг/м³",
    max: 10,
    order: 7,
    danger: { green: 0, yellow: 2, red: 5 },
  },
  "CO_mg--m3_10sec": {
    title: "CO — Угарный газ",
    unit: "мг/м³",
    max: 50,
    order: 8,
    danger: { green: 0, yellow: 5, red: 10 },
  },
  "NO_mg--m3_10sec": {
    title: "NO — Монооксид азота",
    unit: "мг/м³",
    max: 300,
    order: 9,
    danger: { green: 0, yellow: 30, red: 100 },
  },
  "NO2_mg--m3_10sec": {
    title: "NO₂ — Диоксид азота",
    unit: "мг/м³",
    max: 300,
    order: 10,
    danger: { green: 0, yellow: 30, red: 100 },
  },
  "SO2_mg--m3_10sec": {
    title: "SO₂ — Диоксид серы",
    unit: "мг/м³",
    max: 20,
    order: 11,
    danger: { green: 0, yellow: 2, red: 5 },
  },

  // Keep your existing parameters below
  "H2S_mg--m3_10sec": {
    title: "H₂S — Сероводород",
    unit: "мг/м³",
    max: 10,
    order: 12,
    danger: {
      green: 0,
      yellow: 0.1,
      red: 0.3,
    },
  },
  "NH3_mg--m3_10sec": {
    title: "NH₃ — Аммиак",
    unit: "мг/м³",
    max: 20,
    order: 13,
    danger: {
      green: 0,
      yellow: 0.2,
      red: 0.4,
    },
  },
  "PM10_ug--m3_10sec": {
    title: "PM10 — Пыль до 10 мкм",
    unit: "мкг/м³",
    max: 150,
    order: 14,
    danger: {
      green: 0,
      yellow: 50,
      red: 100,
    },
  },
  "PM2_5_ug--m3_10sec": {
    title: "PM2.5 — Мелкодисперсная пыль",
    unit: "мкг/м³",
    max: 75,
    order: 15,
    danger: {
      green: 0,
      yellow: 25,
      red: 50,
    },
  },
};

// Helper functions
export const getDangerLevel = (value, cfg) => {
  if (!cfg?.danger) return "safe";
  const { green, yellow, red } = cfg.danger;

  // For O2, lower is more dangerous
  if (cfg.unit === "%") {
    if (value >= green) return "safe";
    if (value >= yellow) return "warning";
    return "danger";
  }

  // For pollutants, higher is more dangerous
  if (value <= green) return "safe";
  if (value <= yellow) return "warning";
  return "danger";
};

export const getColorByDanger = (level) => {
  switch (level) {
    case "danger":
      return "bg-gradient-to-r from-red-500 to-red-600";
    case "warning":
      return "bg-gradient-to-r from-yellow-500 to-orange-500";
    default:
      return "bg-gradient-to-r from-green-500 to-emerald-500";
  }
};

// Keep your old function for backward compatibility
export const getColorByPercentage = (pct) => {
  if (pct > 80) return "bg-gradient-to-r from-red-400 to-red-600";
  if (pct > 60) return "bg-gradient-to-r from-orange-400 to-orange-500";
  return "bg-gradient-to-r from-green-400 to-green-500";
};
