"use client"

import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  min: number
  max: number
  step: number
  onValueChange: (value: number[]) => void
  className?: string
}

function Slider({ value, min, max, step, onValueChange, className }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      className={cn("w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary", className)}
    />
  )
}

export { Slider }
