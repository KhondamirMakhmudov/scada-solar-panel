"use client";
import React from "react";
import ReactECharts from "echarts-for-react";

const GaugeCard = ({ name, value, min, max, unit }) => {
  const option = {
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        progress: {
          show: true,
          width: 16,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#B388FE" },
                { offset: 1, color: "#9D66FD" },
              ],
            },
          },
        },
        axisLine: {
          lineStyle: {
            width: 16,
            color: [[1, "#EAEAEA"]],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },

        // ✅ Chiroyliroq pointer (custom needle)
        pointer: {
          icon: "path://M2,0 L-2,0 L0,-100 Z", // uchli needle shakli
          length: "75%",
          width: 8,
          itemStyle: {
            color: "#9D66FD", // binafsha needle
            shadowColor: "rgba(0,0,0,0.3)",
            shadowBlur: 6,
          },
        },

        anchor: {
          show: true,
          size: 14,
          itemStyle: {
            color: "#B388FE",
            borderWidth: 2,
            borderColor: "#9D66FD",
          },
        },

        detail: {
          valueAnimation: true,
          formatter: "{value}",
          fontSize: 18,
          color: "#111",
          offsetCenter: [0, "30%"],
        },
        data: [{ value }],
        min,
        max,
      },
    ],
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center hover:shadow-lg transition border border-[#C9AAFE]">
      <ReactECharts option={option} style={{ height: 160, width: "100%" }} />
      <div className="mt-2 text-center">
        <p className="text-sm font-semibold text-gray-700 font-manrope">
          {name}
        </p>
        <p className="text-lg font-bold text-indigo-600">
          {value} <span className="text-sm text-gray-500">{unit}</span>
        </p>
      </div>
    </div>
  );
};

export default GaugeCard;
