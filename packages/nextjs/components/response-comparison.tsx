"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"

export default function ResponseComparison() {
  const [sliderValue, setSliderValue] = useState([50])

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm">Shorthand</span>
        <span className="text-sm">Full Response</span>
      </div>

      <Slider defaultValue={sliderValue} max={100} step={1} onValueChange={handleSliderChange} className="my-4" />

      <div className="relative h-[120px] border border-gray-700 rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-gray-800 p-3 text-sm" style={{ right: `${100 - sliderValue[0]}%` }}>
          <p>refund policy</p>
          <p>30d</p>
          <p>unused = yes</p>
          <p>prorated ok</p>
        </div>

        <div className="absolute inset-0 bg-gray-900 p-3 text-sm" style={{ left: `${sliderValue[0]}%` }}>
          <p>
            Our refund policy offers a 30-day money back guarantee. We provide full refunds for unused subscription
            periods and pro-rated refunds are available for partially used services. Please contact our support team for
            assistance with processing your refund request.
          </p>
        </div>
      </div>
    </div>
  )
}
