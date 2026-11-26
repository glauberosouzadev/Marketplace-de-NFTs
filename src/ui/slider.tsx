import type { ComponentProps } from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

function Slider({
  className,
  defaultValue,
  value,
  thumbLabels,
  ...props
}: ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const thumbs = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [0]
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="bg-border relative h-1 w-full grow overflow-hidden rounded-full">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      {thumbs.map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels?.[index]}
          className="border-primary bg-background focus-visible:ring-ring focus-visible:ring-offset-background block size-4 shrink-0 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
