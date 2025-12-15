// Node Group Component
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Typography } from "@mui/material";
import { get } from "lodash";

const NodeGroup = ({ nodes = [] }) => {
  const [openNodeId, setOpenNodeId] = useState(null);

  const handleNodeToggle = (nodeId) => {
    setOpenNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  return (
    <div className="space-y-2 node-tree manrope">
      {nodes.map((node) => (
        <div key={node.id} className="bg-gray-700 rounded-lg">
          {/* Node title row */}
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-600 transition-colors duration-200 rounded-lg"
            onClick={() => handleNodeToggle(node.id)}
          >
            <div className="flex items-center gap-2">
              <ChevronRightIcon
                className="w-4 h-4 text-gray-400 transition-transform duration-200"
                style={{
                  transform:
                    openNodeId === node.id ? "rotate(90deg)" : "rotate(0deg)",
                }}
              />
              <Typography
                sx={{ fontFamily: "Manrope" }}
                className="text-white font-medium"
              >
                {get(node, "description", "-")}
              </Typography>
            </div>
            <Typography
              sx={{ fontFamily: "Manrope" }}
              className="text-xs text-gray-400"
            >
              {get(node, "type", "")}
            </Typography>
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {openNodeId === node.id && (
              <motion.div
                key="content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="p-5 border-t border-gray-700 bg-[#1E1E2F] rounded-b-lg"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Описание */}
                  <div className="bg-[#2B2B3F] hover:bg-[#34344A] transition-all duration-200 rounded-xl p-4 shadow-sm border border-gray-700">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Описание
                    </div>
                    <div className="text-white font-medium">
                      {get(node, "description", "-")}
                    </div>
                  </div>

                  {/* Идентификатор */}
                  <div className="bg-[#2B2B3F] hover:bg-[#34344A] transition-all duration-200 rounded-xl p-4 shadow-sm border border-gray-700">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Идентификатор
                    </div>
                    <div className="text-[#C3A6FF] font-mono text-sm break-all">
                      {get(node, "identifier", "-")}
                    </div>
                  </div>

                  {/* Единицы измерения */}
                  <div className="bg-[#2B2B3F] hover:bg-[#34344A] transition-all duration-200 rounded-xl p-4 shadow-sm border border-gray-700">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Единицы измерения
                    </div>
                    <div className="text-[#9AE6B4] font-medium">
                      {get(node, "units", "-")}
                    </div>
                  </div>

                  {/* Тип */}
                  <div className="bg-[#2B2B3F] hover:bg-[#34344A] transition-all duration-200 rounded-xl p-4 shadow-sm border border-gray-700">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Тип
                    </div>
                    <div className="text-white font-medium">
                      {get(node, "type", "-")}
                    </div>
                  </div>
                </div>

                <div className="text-gray-500 text-xs mt-4 italic border-t border-gray-700 pt-2">
                  Обновлено:{" "}
                  {new Date(get(node, "updated_at")).toLocaleString()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default NodeGroup;
