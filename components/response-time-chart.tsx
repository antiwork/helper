"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ResponseTimeChart() {
  const [data, setData] = useState([
    { name: "Jan", withHelper: 12, withoutHelper: 30 },
    { name: "Feb", withHelper: 10, withoutHelper: 35 },
    { name: "Mar", withHelper: 8, withoutHelper: 40 },
    { name: "Apr", withHelper: 9, withoutHelper: 45 },
    { name: "May", withHelper: 7, withoutHelper: 50 },
    { name: "Jun", withHelper: 6, withoutHelper: 55 },
  ]);

  return (
    <div className="w-full h-96 bg-[#412020] rounded-xl p-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
          <Line
            type="monotone"
            dataKey="withHelper"
            name="With Helper"
            stroke="#FFB800"
            strokeWidth={3}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="withoutHelper"
            name="Without Helper"
            stroke="#FF5C00"
            strokeWidth={3}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ResponseTimeChart;
