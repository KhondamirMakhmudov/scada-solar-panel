import { formatTagLabelShort } from "@/lib/tagNameTranslation";

/**
 * Fill palette for the per-device header bar, cycled if there are more
 * groups than colors. Picked to read clearly with white text (WCAG-ish
 * contrast), not tied to the app's dark SCADA theme — the export is a
 * document meant to be opened in Excel/printed, not a mimic of the screen.
 */
const DEVICE_COLORS = [
  "FF2563EB", // blue
  "FF059669", // green
  "FF7C3AED", // purple
  "FFD97706", // amber
  "FFDB2777", // pink
  "FF0891B2", // teal
  "FFDC2626", // red
  "FF4F46E5", // indigo
];

const HEADER_FILL = "FF0F172A";
const BAND_FILL = "FFF1F5F9";
const BORDER = { style: "thin", color: { argb: "FFCBD5E1" } };
const THIN_BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

/**
 * Previously exported one sheet per device, which read as "the export is
 * broken / only has one device" to anyone who didn't notice the extra sheet
 * tabs at the bottom. A single sheet with every device's tags as adjacent
 * column blocks sharing one time axis is both unambiguous (nothing hidden on
 * another tab) and more useful — an operator can compare inverters
 * side-by-side on one screen instead of switching sheets.
 *
 * Buckets line up because every tag in the export comes from the same
 * request (shared range + interval), so a single global time column is
 * valid — it isn't approximating anything.
 */
export async function exportTagHistoryToExcel({ groups, seriesByTagId, valueMaps, fileName, periodLabel, title }) {
  const groupsWithData = groups.filter((g) => g.tags.length > 0);
  if (groupsWithData.length === 0) return { written: false, rowCount: 0 };

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SCADA";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Архив", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
  });

  const allTags = groupsWithData.flatMap((g) => g.tags);
  const totalCols = 1 + allTags.length;

  // Union of every bucket timestamp across every selected tag — a device
  // whose bucket is briefly missing (sparse polling) just leaves that one
  // cell blank instead of dropping the whole row.
  const rowsByMs = new Map();
  allTags.forEach((tag) => {
    const isEnum = Boolean(valueMaps?.get(tag.id));
    const points = seriesByTagId.get(tag.id) || [];
    points.forEach((p) => {
      const row = rowsByMs.get(p.ms) || { ms: p.ms };
      row[tag.id] = isEnum ? p.last : p.avg;
      rowsByMs.set(p.ms, row);
    });
  });
  const sortedRows = Array.from(rowsByMs.values()).sort((a, b) => a.ms - b.ms);

  // Row 1: title
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title || "Архив значений тегов SCADA";
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 26;

  // Row 2: subtitle (period + generation timestamp)
  sheet.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = `${periodLabel ? `${periodLabel} · ` : ""}Сформировано ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(2).height = 18;

  // Row 3: per-device color bar, merged across that device's tag columns
  const deviceHeaderRow = 3;
  sheet.mergeCells(deviceHeaderRow, 1, deviceHeaderRow + 1, 1); // "Время" spans both header rows
  const timeHeaderCell = sheet.getCell(deviceHeaderRow, 1);
  timeHeaderCell.value = "Время";
  timeHeaderCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  timeHeaderCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  timeHeaderCell.alignment = { vertical: "middle", horizontal: "center" };
  timeHeaderCell.border = THIN_BORDERS;

  let col = 2;
  groupsWithData.forEach((group, groupIndex) => {
    const color = DEVICE_COLORS[groupIndex % DEVICE_COLORS.length];
    const startCol = col;
    const endCol = col + group.tags.length - 1;

    if (endCol > startCol) sheet.mergeCells(deviceHeaderRow, startCol, deviceHeaderRow, endCol);
    const deviceCell = sheet.getCell(deviceHeaderRow, startCol);
    deviceCell.value = group.label;
    deviceCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    deviceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    deviceCell.alignment = { vertical: "middle", horizontal: "center" };
    for (let c = startCol; c <= endCol; c += 1) {
      sheet.getCell(deviceHeaderRow, c).border = THIN_BORDERS;
      sheet.getCell(deviceHeaderRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    }

    // Row 4: per-tag column headers under this device's bar
    group.tags.forEach((tag) => {
      const cell = sheet.getCell(deviceHeaderRow + 1, col);
      cell.value = `${formatTagLabelShort(tag.name)}${tag.unit ? `, ${tag.unit}` : ""}`;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = THIN_BORDERS;
      col += 1;
    });
  });
  sheet.getRow(deviceHeaderRow).height = 20;
  sheet.getRow(deviceHeaderRow + 1).height = 30;

  const dataStartRow = deviceHeaderRow + 2;

  if (sortedRows.length === 0) {
    sheet.mergeCells(dataStartRow, 1, dataStartRow, totalCols);
    const emptyCell = sheet.getCell(dataStartRow, 1);
    emptyCell.value = "Нет данных за выбранный период";
    emptyCell.font = { italic: true, color: { argb: "FF94A3B8" } };
    emptyCell.alignment = { vertical: "middle", horizontal: "center" };
  } else {
    sortedRows.forEach((row, rowIndex) => {
      const excelRow = dataStartRow + rowIndex;
      const timeCell = sheet.getCell(excelRow, 1);
      timeCell.value = new Date(row.ms);
      timeCell.numFmt = "dd.mm.yyyy hh:mm:ss";
      timeCell.border = THIN_BORDERS;

      let dataCol = 2;
      groupsWithData.forEach((group) => {
        group.tags.forEach((tag) => {
          const cell = sheet.getCell(excelRow, dataCol);
          const value = row[tag.id];
          const mappedLabel = valueMaps?.get(tag.id) && Number.isInteger(value)
            ? valueMaps.get(tag.id)[String(value)]
            : undefined;
          if (mappedLabel !== undefined) {
            cell.value = mappedLabel;
            cell.alignment = { horizontal: "center" };
          } else if (typeof value === "number" && Number.isFinite(value)) {
            cell.value = value;
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right" };
          } else {
            cell.alignment = { horizontal: "center" };
          }
          cell.border = THIN_BORDERS;
          dataCol += 1;
        });
      });

      if (rowIndex % 2 === 1) {
        for (let c = 1; c <= totalCols; c += 1) {
          sheet.getCell(excelRow, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND_FILL } };
        }
      }
    });
  }

  sheet.autoFilter = {
    from: { row: deviceHeaderRow + 1, column: 1 },
    to: { row: deviceHeaderRow + 1, column: totalCols },
  };

  sheet.getColumn(1).width = 20;
  col = 2;
  groupsWithData.forEach((group) => {
    group.tags.forEach((tag) => {
      const header = `${formatTagLabelShort(tag.name)}${tag.unit ? `, ${tag.unit}` : ""}`;
      sheet.getColumn(col).width = Math.max(13, Math.min(24, header.length + 2));
      col += 1;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || `Архив_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { written: true, rowCount: sortedRows.length };
}
