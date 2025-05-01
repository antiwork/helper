"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"

export default function ComparisonHistogram() {
  const [showAI, setShowAI] = useState(false)
  
  const beforeData = [2, 4, 8, 12, 18, 22, 25, 20, 15, 10, 6, 3]
  const afterData = [35, 25, 15, 10, 7, 5, 4, 3, 2, 1, 1, 1]
  const timeIntervals = ["0-5", "5-10", "10-15", "15-20", "20-25", "25-30", "30-35", "35-40", "40-45", "45-50", "50-55", "55-60"]
  
  const data = showAI ? afterData : beforeData
  const maxValue = Math.max(...(showAI ? afterData : beforeData))
  
  return (
    <div className="w-full max-w-3xl mx-auto mt-12">
      <div className="flex items-center justify-end gap-4 mb-8">
        <span className={`text-gray-400 transition-opacity duration-500 ${!showAI ? 'opacity-100' : 'opacity-50'}`}>
          Before AI
        </span>
        <Switch 
          checked={showAI}
          onCheckedChange={setShowAI}
          className="data-[state=checked]:bg-amber-500"
        />
        <span className={`text-gray-400 transition-opacity duration-500 ${showAI ? 'opacity-100' : 'opacity-50'}`}>
          With AI agents
        </span>
      </div>
      
      <div className="relative h-[300px]">
        {data.map((value, index) => {
          const heightPercentage = (value / maxValue) * 100
          return (
            <div 
              key={index} 
              className="absolute bottom-8 transition-all duration-700 ease-in-out" 
              style={{
                left: `${(index / data.length) * 100}%`,
                width: `${100 / data.length}%`,
                height: `${(value / maxValue) * 240}px`,
                transform: `scaleY(${heightPercentage / 100})`,
                transformOrigin: 'bottom'
              }}
            >
              <div 
                className="mx-1 h-full bg-amber-500 rounded-sm transition-all duration-700"
                style={{
                  opacity: showAI ? 1 : 0.7
                }}
              />
            </div>
          )
        })}
        
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-gray-400">
          {timeIntervals.map((interval, index) => (
            <div 
              key={index} 
              className="text-center transition-all duration-500"
              style={{
                width: `${100 / timeIntervals.length}%`,
                opacity: 0.7
              }}
            >
              {interval}
            </div>
          ))}
        </div>
        
        {/* Y-axis label */}
        <div className="absolute -bottom-8 left-0 right-0 text-center text-gray-400 transition-opacity duration-500">
          Time to resolution (minutes)
        </div>
      </div>
      
      {/* Improvement indicator with animation */}
      <div 
        className="mt-4 text-center transition-all duration-700 ease-out"
        style={{
          opacity: showAI ? 1 : 0,
          transform: `translateY(${showAI ? 0 : '20px'})`,
          color: '#4ade80'
        }}
      >
        ↑ 68% faster response times
      </div>
    </div>
  )
}
