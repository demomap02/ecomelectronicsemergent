import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, ...props }, ref) => {
  const values = props.value ?? props.defaultValue ?? [0];
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}>
      <SliderPrimitive.Track
        className="relative h-1.5 w-full grow overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
        <SliderPrimitive.Range className="absolute h-full" style={{ background: "var(--primary)" }} />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-4 w-4 rounded-full shadow transition-transform hover:scale-110 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          style={{ background: "var(--surface)", border: "2px solid var(--primary)" }} />
      ))}
    </SliderPrimitive.Root>
  );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
