"use client"

import { ArrowUp, ArrowDown } from "lucide-react"

export default function SentimentGraph() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const positiveData = [65, 60, 70, 75, 80, 85, 90]
  const negativeData = [35, 40, 30, 25, 20, 15, 10]

  // Calculate week-over-week change
  const positiveChange = positiveData[6] - positiveData[0]
  const negativeChange = negativeData[6] - negativeData[0]

  return (
    <div className="p-6 rounded-lg bg-[#2B0808] border border-burgundy-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-white">Sentiment Trends</h3>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
            <span className="text-xs text-gray-300">Positive</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
            <span className="text-xs text-gray-300">Negative</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Positive Sentiment</span>
            <div className={`flex items-center ${positiveChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {positiveChange >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
              <span className="text-sm font-medium">{Math.abs(positiveChange)}%</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400">{positiveData[6]}%</div>
          <div className="text-xs text-gray-400 mt-1">Current</div>
        </div>

        <div className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Negative Sentiment</span>
            <div className={`flex items-center ${negativeChange <= 0 ? "text-green-400" : "text-red-400"}`}>
              {negativeChange <= 0 ? <ArrowDown className="h-4 w-4 mr-1" /> : <ArrowUp className="h-4 w-4 mr-1" />}
              <span className="text-sm font-medium">{Math.abs(negativeChange)}%</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-400">{negativeData[6]}%</div>
          <div className="text-xs text-gray-400 mt-1">Current</div>
        </div>
      </div>

      <div className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700">
        <div className="flex justify-between items-end h-20 mb-2">
          {positiveData.map((value, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="relative w-4">
                <div
                  className="absolute bottom-0 w-4 bg-green-400 rounded-t"
                  style={{ height: `${value * 0.2}px` }}
                ></div>
                <div
                  className="absolute bottom-0 w-4 bg-red-400 rounded-t opacity-50"
                  style={{ height: `${negativeData[index] * 0.2}px` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {days.map((day, index) => (
            <div key={index} className="text-xs text-gray-400">
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
