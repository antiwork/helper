"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const initialData = [
  { volume: "Low", withHelper: 2, withoutHelper: 8 },
  { volume: "Medium", withHelper: 3, withoutHelper: 15 },
  { volume: "High", withHelper: 5, withoutHelper: 25 },
  { volume: "Peak", withHelper: 8, withoutHelper: 40 },
]

export default function ResponseTimeChart() {
  const [data, setData] = useState(initialData)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isAnimating])

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="volume" stroke="#888" />
          <YAxis
            stroke="#888"
            label={{
              value: "Minutes",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fill: "#888" },
            }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#222", border: "1px solid #444" }}
            labelStyle={{ color: "#fff" }}
          />
          <Legend />
          <Bar
            dataKey="withHelper"
            name="With Helper"
            fill="#F59E0B"
            isAnimationActive={isAnimating}
            animationDuration={1500}
          />
          <Bar
            dataKey="withoutHelper"
            name="Without Helper"
            fill="#6B7280"
            isAnimationActive={isAnimating}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
