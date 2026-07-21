import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Explicit light-mode colours so text is always visible on white
          "flex h-12 w-full rounded-xl px-4 py-2 text-sm transition-all",
          "bg-white text-[#1F2937]",
          "border border-[#D1D5DB]",
          "placeholder:text-[#9CA3AF]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(90,45,130,.2)] focus-visible:border-[#5A2D82]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // datetime-local / color picker chrome
          "[color-scheme:light]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
