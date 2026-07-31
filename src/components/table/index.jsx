import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// ✅ Helper: sahifalarni hisoblab beradi (ellipsis bilan)
const getPaginationRange = (currentPage, totalPages, siblingCount = 1) => {
  const totalPageNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalPageNumbers) {
    return [...Array(totalPages).keys()].map((n) => n + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  const range = [];

  if (!showLeftDots && showRightDots) {
    const leftRange = [...Array(3 + 2 * siblingCount).keys()].map((n) => n + 1);
    return [...leftRange, "...", totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightRange = [...Array(3 + 2 * siblingCount).keys()].map(
      (n) => totalPages - (3 + 2 * siblingCount) + n + 1,
    );
    return [1, "...", ...rightRange];
  }

  if (showLeftDots && showRightDots) {
    return [
      1,
      "...",
      ...Array(rightSibling - leftSibling + 1)
        .fill(0)
        .map((_, i) => leftSibling + i),
      "...",
      totalPages,
    ];
  }

  return [];
};

const CustomTable = ({ data, columns, pagination }) => {
  const {
    currentPage = 1,
    pageSize = 10,
    total = 0, // umumiy yozuvlar soni backenddan kelsa
    onPaginationChange = () => {},
  } = pagination || {};

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalPages = Math.ceil(total / pageSize);

  const handlePageClick = (page) => {
    if (page !== "..." && page !== currentPage) {
      onPaginationChange({
        page,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });
    }
  };

  return (
    <div className="overflow-x-auto border border-surface-border rounded-md font-ibmPlexSans">
      <table className="min-w-full text-left">
        <thead className="bg-background-dark border-b border-surface-border">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUpwardIcon sx={{ fontSize: 13 }} />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDownwardIcon sx={{ fontSize: 13 }} />
                    ) : (
                      <UnfoldMoreIcon
                        sx={{ fontSize: 13 }}
                        className="text-text-faint"
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <motion.tbody layout className="bg-surface-dark text-text-primary text-[12.5px] font-ibmPlexMono">
          <AnimatePresence>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                layout
                key={row.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-[#232222] cursor-auto transition-colors duration-150"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-2 border-t border-t-surface-border"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </AnimatePresence>
        </motion.tbody>
      </table>

      {/* ✅ Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 py-3 border-t border-surface-border bg-background-dark">
          <button
            onClick={() => currentPage > 1 && handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-7 h-7 flex items-center justify-center border border-surface-border rounded-[2px] text-text-secondary cursor-pointer hover:border-surface-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon sx={{ fontSize: 15 }} />
          </button>

          {getPaginationRange(currentPage, totalPages).map((p, i) => (
            <button
              key={i}
              onClick={() => handlePageClick(p)}
              disabled={p === "..."}
              className={`min-w-7 h-7 px-1.5 border rounded-[2px] text-[11px] font-ibmPlexMono cursor-pointer transition-colors ${
                p === currentPage
                  ? "bg-primary border-primary text-white"
                  : p === "..."
                    ? "cursor-default border-transparent text-text-faint"
                    : "border-surface-border text-text-secondary hover:border-surface-border-hover"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() =>
              currentPage < totalPages && handlePageClick(currentPage + 1)
            }
            disabled={currentPage === totalPages}
            className="w-7 h-7 flex items-center justify-center border border-surface-border rounded-[2px] text-text-secondary cursor-pointer hover:border-surface-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon sx={{ fontSize: 15 }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomTable;
