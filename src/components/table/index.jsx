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
      (n) => totalPages - (3 + 2 * siblingCount) + n + 1
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
    <div className="overflow-x-auto border-none rounded-lg manrope">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-[#8b5cf6] text-white">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2 font-medium cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() === "asc" ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ArrowDownwardIcon fontSize="small" />
                    ) : (
                      <UnfoldMoreIcon
                        fontSize="small"
                        className="text-gray-400"
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <motion.tbody layout className="bg-[#1F2937] text-white">
          <AnimatePresence>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                layout
                key={row.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="hover:bg-[#555b64] cursor-auto"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2 border-t border-t-[#E9E9E9]"
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
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => currentPage > 1 && handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-200 cursor-pointer rounded disabled:opacity-50"
          >
            ←
          </button>

          {getPaginationRange(currentPage, totalPages).map((p, i) => (
            <button
              key={i}
              onClick={() => handlePageClick(p)}
              disabled={p === "..."}
              className={`px-3 py-1 border border-gray-200 cursor-pointer rounded ${
                p === currentPage
                  ? "bg-blue-500 text-white"
                  : p === "..."
                  ? "cursor-default text-gray-500"
                  : "hover:bg-gray-100"
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
            className="px-3 py-1 border border-gray-200 cursor-pointer rounded disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomTable;
