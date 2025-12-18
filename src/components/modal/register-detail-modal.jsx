import React from "react";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import {
  Description as DescriptionIcon,
  DesktopWindows as DesktopWindowsIcon,
  Settings as SettingsIcon,
  LocationOn as LocationOnIcon,
  Functions as FunctionsIcon,
  DataArray as DataArrayIcon,
  SwapVert as SwapVertIcon,
  Add as AddIcon,
  Timeline as TimelineIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

const RegisterDetailsModal = ({ isOpen, onClose, register }) => {
  if (!isOpen || !register) return null;

  const detailSections = [
    {
      title: "Основная информация",
      fields: [
        {
          label: "Имя регистра",
          value: register.name,
          icon: <DescriptionIcon />,
        },
        {
          label: "Описание",
          value: register.description || "—",
          icon: <DescriptionIcon />,
        },
        {
          label: "Имя устройства",
          value: register.deviceName,
          icon: <DesktopWindowsIcon />,
        },
      ],
    },
    {
      title: "Параметры адресации",
      fields: [
        {
          label: "Адрес начала",
          value: register.startAddress,
          icon: <LocationOnIcon />,
        },
        {
          label: "Код функции",
          value: register.functionCode,
          icon: <FunctionsIcon />,
        },
      ],
    },
    {
      title: "Тип данных",
      fields: [
        {
          label: "Тип данных",
          value: register.dataType,
          badge: true,
          color: "blue",
        },
        {
          label: "Порядок байтов",
          value: register.byteOrder,
          badge: true,
          color: "primary",
        },
      ],
    },
    {
      title: "Параметры преобразования",
      fields: [
        { label: "Множитель", value: register.multiplier, icon: <CloseIcon /> }, // ✖️ belgisi uchun
        { label: "Смещение", value: register.offsetValue, icon: <AddIcon /> },
        {
          label: "Единица измерения",
          value: register.unit || "—",
          icon: <TimelineIcon />,
        },
      ],
    },
    {
      title: "Диапазон значений",
      fields: [
        {
          label: "Минимальное значение",
          value: register.minValue || "—",
          icon: <ArrowDownwardIcon />,
        },
        {
          label: "Максимальное значение",
          value: register.maxValue || "—",
          icon: <ArrowUpwardIcon />,
        },
      ],
    },
    {
      title: "Настройки",
      fields: [
        {
          label: "Сохранение в БД",
          value: register.saveToDb ? "Включено" : "Отключено",
          status: register.saveToDb,
          icon: <SaveIcon />,
        },
        {
          label: "Отправка клиенту",
          value: register.sendToClient ? "Включено" : "Отключено",
          status: register.sendToClient,
          icon: <SendIcon />,
        },
      ],
    },
  ];

  const badgeColors = {
    blue: "bg-blue-900/20 text-blue-400 border-blue-900/30",
    primary: "bg-primary-900/20 text-primary border-primary-900/30",
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-manrope">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-background-dark border border-surface-dark rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-b border-surface-dark p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1 flex items-center gap-3">
                <span className="text-primary text-3xl">
                  <DescriptionIcon fontSize="large" />
                </span>
                Детали регистра
              </h2>
              <p className="text-sm text-gray-400">
                Полная информация о регистре Modbus
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-dark rounded-lg transition-all text-gray-400 hover:text-gray-200 active:scale-95"
            >
              <CloseIcon fontSize="medium" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {detailSections.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sectionIndex * 0.05 }}
                className="bg-surface-dark/30 rounded-lg p-5 border border-surface-dark"
              >
                <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  {section.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field, fieldIndex) => (
                    <div
                      key={fieldIndex}
                      className="bg-background-dark/50 rounded-lg p-4 border border-surface-dark/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-400 mb-2">
                            {field.label}
                          </p>
                          {field.badge ? (
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold border ${
                                badgeColors[field.color]
                              }`}
                            >
                              {field.value}
                            </span>
                          ) : field.status !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  field.status ? "bg-primary" : "bg-red-500"
                                }`}
                              ></span>
                              <span
                                className={`text-sm font-medium ${
                                  field.status ? "text-primary" : "text-red-400"
                                }`}
                              >
                                {field.value}
                              </span>
                            </div>
                          ) : (
                            <p className="text-base font-semibold text-gray-100">
                              {field.value}
                            </p>
                          )}
                        </div>
                        {field.icon && (
                          <span className="text-primary/50">
                            {React.cloneElement(field.icon, {
                              fontSize: "small",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-6 p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg">
            <div className="flex items-center gap-2">
              <InfoIcon className="text-blue-400" />
              <p className="text-sm text-blue-400">
                <strong>Совет:</strong> Используйте кнопку редактирования для
                изменения параметров регистра
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-surface-dark p-4 bg-surface-dark/20">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 bg-surface-dark text-gray-300 text-sm font-bold rounded-lg hover:bg-opacity-80 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <CloseIcon fontSize="small" />
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterDetailsModal;
