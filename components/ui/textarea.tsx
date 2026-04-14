import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'glass-sm ios-tile w-full min-h-24 px-4 py-3 text-sm outline-none resize-y',
        'placeholder:text-muted-foreground',
        'focus-visible:ring-[3px] focus-visible:ring-white/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }