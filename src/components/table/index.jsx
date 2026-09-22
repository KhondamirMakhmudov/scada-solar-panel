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
    <div className="overflow-x-auto border border-white/[0.08] rounded-xl font-ibmPlexSans">
      <table className="min-w-full text-left">
        <thead className="bg-[#18181c] border-b border-white/[0.08]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                // A column whose cells are right-aligned (numeric counts, a
                // trailing action-links group) needs its header right-aligned
                // too — otherwise the header text sits at the column's left
                // edge while every value under it hugs the right edge, which
                // reads as broken rather than deliberate.
                const align = header.column.columnDef.meta?.align;
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-[13px] font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary cursor-pointer select-none transition-colors ${
                      align === "right" ? "text-right" : ""
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
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
                );
              })}
            </tr>
          ))}
        </thead>
        <motion.tbody layout className="bg-surface-dark text-text-primary text-[14.5px] font-ibmPlexMono">
          <AnimatePresence>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                layout
                key={row.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-white/[0.03] cursor-auto transition-colors duration-150"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5 border-t border-t-white/[0.06]"
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
        <div className="flex justify-center items-center gap-1.5 py-3 border-t border-white/[0.08] bg-[#18181c]">
          <button
            onClick={() => currentPage > 1 && handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-lg text-text-secondary cursor-pointer transition-colors enabled:hover:border-primary/40 enabled:active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <ChevronLeftIcon sx={{ fontSize: 15 }} />
          </button>

          {getPaginationRange(currentPage, totalPages).map((p, i) => (
            <button
              key={i}
              onClick={() => handlePageClick(p)}
              disabled={p === "..."}
              className={`min-w-8 h-8 px-1.5 border rounded-lg text-[13px] font-ibmPlexMono cursor-pointer transition-colors active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                p === currentPage
                  ? "bg-primary border-primary text-white"
                  : p === "..."
                    ? "cursor-default border-transparent text-text-faint"
                    : "border-white/15 text-text-secondary hover:border-primary/40"
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
            className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-lg text-text-secondary cursor-pointer transition-colors enabled:hover:border-primary/40 enabled:active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          >
            <ChevronRightIcon sx={{ fontSize: 15 }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomTable;
