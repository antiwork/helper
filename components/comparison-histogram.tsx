"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ComparisonHistogram() {
  const [data, setData] = useState([
    { name: "Day 1", withHelper: 5, withoutHelper: 15 },
    { name: "Day 2", withHelper: 4, withoutHelper: 18 },
    { name: "Day 3", withHelper: 6, withoutHelper: 20 },
    { name: "Day 4", withHelper: 5, withoutHelper: 22 },
    { name: "Day 5", withHelper: 4, withoutHelper: 25 },
    { name: "Day 6", withHelper: 5, withoutHelper: 28 },
    { name: "Day 7", withHelper: 6, withoutHelper: 30 },
  ]);

  return (
    <div className="w-full h-96 bg-[#412020] rounded-xl p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
          <XAxis dataKey="name" stroke="#fff" />
          <YAxis stroke="#fff" label={{ value: "Minutes", angle: -90, position: "insideLeft", fill: "#fff" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "#2B0808", border: "1px solid #555", borderRadius: "4px" }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend wrapperStyle={{ color: "#fff" }} />
          <Bar dataKey="withHelper" name="With Helper" fill="#FFB800" radius={[4, 4, 0, 0]} />
          <Bar dataKey="withoutHelper" name="Without Helper" fill="#FF5C00" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ComparisonHistogram;
