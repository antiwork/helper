"use client";

import React, { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBreakpoint } from "./useBreakpoint";

function ComparisonHistogram() {
  const [data] = useState([
    { name: "Day 1", withHelper: 8, withoutHelper: 13 },
    { name: "Day 2", withHelper: 6, withoutHelper: 15 },
    { name: "Day 3", withHelper: 3, withoutHelper: 10 },
    { name: "Day 4", withHelper: 2, withoutHelper: 11 },
    { name: "Day 5", withHelper: 2, withoutHelper: 13 },
    { name: "Day 6", withHelper: 1, withoutHelper: 13 },
    { name: "Day 7", withHelper: 1, withoutHelper: 13 },
  ]);

  const { isAboveMd } = useBreakpoint("md");

  const chartColors = {
    background: "var(--color-card, #250404)",
    text: "var(--color-foreground, #FFE6B0)", 
    textSecondary: "var(--color-muted-foreground, #fff)",
    withHelper: "#FEB81D",
    withoutHelper: "#FF4343",
    tooltipBg: "var(--color-card, #250404)",
    cursorHover: "rgba(255,255,255,0.04)",
    foreground: "var(--color-foreground, #fff)"
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-[rgba(99,72,71,0.3)] dark:bg-card rounded-3xl p-4 md:p-10 flex flex-col items-center min-h-[400px] h-full flex-1">
      <div className="text-center mb-2">
        <div className="text-3xl font-bold text-[#FFE6B0] dark:text-foreground mb-1">Response time</div>
      </div>
      <div className="w-full flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            barCategoryGap={isAboveMd ? 10 : 6}
            barGap={isAboveMd ? 5 : 3}
            margin={
              isAboveMd ? { top: 10, right: 10, left: 30, bottom: 40 } : { top: 6, right: 6, left: 10, bottom: 28 }
            }
          >
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: chartColors.text,
                fontSize: isAboveMd ? 14 : 12, 
                fontWeight: 500, 
                dy: isAboveMd ? 12 : 8 
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ 
                fill: chartColors.foreground, 
                fontSize: isAboveMd ? 16 : 12, 
                fontWeight: 400 
              }}
              width={isAboveMd ? 40 : 28}
              label={{
                value: "minutes",
                angle: -90,
                position: "insideLeft",
                fill: chartColors.text,
                fontSize: isAboveMd ? 16 : 12,
                fontWeight: 500,
                dx: isAboveMd ? -10 : -8,
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: chartColors.tooltipBg, 
                border: "1px solid var(--color-border, transparent)", 
                borderRadius: 8, 
                color: chartColors.foreground,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
              labelStyle={{ color: chartColors.foreground }}
              cursor={{ fill: "var(--color-muted, rgba(255,255,255,0.04))" }}
              formatter={(value: number) => (value === 1 ? `${value} minute` : `${value} minutes`)}
            />
            <Bar
              dataKey="withHelper"
              name="With Helper"
              fill={chartColors.withHelper}
              radius={[8, 8, 8, 8]}
              barSize={isAboveMd ? 32 : 18}
            />
            <Bar
              dataKey="withoutHelper"
              name="Without Helper"
              fill={chartColors.withoutHelper}
              radius={[8, 8, 8, 8]}
              barSize={isAboveMd ? 32 : 18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 md:gap-6 justify-center mt-4 md:mt-8 mb-1 md:mb-2">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="inline-block w-3 h-3 md:w-5 md:h-5 rounded-md bg-[#FEB81D]" />
          <span className="text-[#FFE6B0] dark:text-foreground text-sm md:text-lg">With Helper</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <span className="inline-block w-3 h-3 md:w-5 md:h-5 rounded-md bg-[#FF4343]" />
          <span className="text-[#FFE6B0] dark:text-foreground text-sm md:text-lg">Without Helper</span>
        </div>
      </div>
    </div>
  );
}

export default ComparisonHistogram;