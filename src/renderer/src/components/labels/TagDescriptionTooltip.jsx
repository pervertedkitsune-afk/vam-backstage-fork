// [AddOn] Tabs_Begin
import { useEffect, useState } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { TabsAddon } from '@/addons/tabsAddon'

/**
 * Wraps children with a Tooltip displaying description if present,
 * using the configured delay duration from settings.
 * If description is empty or missing, renders children directly without tooltip.
 */
export function TagDescriptionTooltip({ description, children }) {
  const [delay, setDelay] = useState(3000)

  useEffect(() => {
    let cancelled = false
    TabsAddon.getTooltipDelayMs().then((ms) => {
      if (!cancelled) setDelay(ms)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const trimmed = (description || '').trim()
  if (!trimmed) {
    return children
  }

  return (
    <Tooltip delayDuration={delay}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs whitespace-pre-wrap">
        {trimmed}
      </TooltipContent>
    </Tooltip>
  )
}
// [AddOn] Tabs_End
