import { useState } from "react";
import toast from "react-hot-toast";
import GridOnIcon from "@mui/icons-material/GridOn";
import { exportTagHistoryToExcel } from "./exportToExcel";

/**
 * "Экспорт в Excel" for the current tag-history selection. Styled to match
 * SegmentedControl (h-8, rounded-[2px], surface border) since it always sits
 * next to it in the toolbar.
 *
 * Gated on `isFetching`, not just on having a selection: the history query is
 * async, so a click right after picking tags can otherwise race ahead of the
 * data and silently write a header-only workbook.
 */
const ExportExcelButton = ({
  groups,
  seriesByTagId,
  valueMaps,
  fileName,
  periodLabel,
  title,
  disabled = false,
  isFetching = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const hasSelection = groups.some((g) => g.tags.length > 0);
  const isDisabled = disabled || isExporting || isFetching || !hasSelection;

  const handleExport = async () => {
    if (isDisabled) return;
    setIsExporting(true);
    try {
      const result = await exportTagHistoryToExcel({
        groups,
        seriesByTagId,
        valueMaps,
        fileName,
        periodLabel,
        title,
      });
      if (result.written && result.rowCount === 0) {
        toast.error("За выбранный период нет данных — файл выгружен только с заголовками");
      }
    } catch (error) {
      toast.error("Не удалось экспортировать в Excel");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      title={
        isFetching
          ? "Дождитесь загрузки данных"
          : "Экспортировать выбранные теги в Excel"
      }
      className={`inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-[2px] border border-surface-border bg-surface-1 px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1 ${
        isDisabled
          ? "cursor-not-allowed text-[#3a3a3a]"
          : "text-[#6b7280] hover:text-[#e5e2e1] hover:bg-surface-2 active:scale-[0.96] active:bg-surface-3"
      }`}
    >
      <GridOnIcon sx={{ fontSize: 15 }} />
      {isExporting ? "Экспорт…" : isFetching ? "Загрузка…" : "Excel"}
    </button>
  );
};

export default ExportExcelButton;
