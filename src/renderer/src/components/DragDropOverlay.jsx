// [AddOn] DragnDrop_Begin
import { useDragDropState, DragDropAddon } from '@/addons/dragDropAddon'
import { useThumbnail } from '@/hooks/createBlobCacheHook'
import { getGradient } from '@/lib/utils'
import { FolderDown } from 'lucide-react'

/**
 * Floating drag preview overlay element.
 * Displays a faded, transparent "echo" thumbnail of the first dragged package (like Windows file drag)
 * along with a number badge beside the mouse cursor indicating how many files are being dragged/moved.
 */
export function DragDropOverlay() {
  const { isDragging, draggedPackages, hoveredLocation, mousePosition } = useDragDropState()
  const firstFilename = isDragging && draggedPackages.length > 0 ? draggedPackages[0] : null
  const thumbUrl = useThumbnail(firstFilename ? `pkg:${firstFilename}` : null)

  if (!isDragging || !firstFilename) return null

  const count = draggedPackages.length
  const folderName = hoveredLocation ? DragDropAddon.formatFolderLabel(hoveredLocation) : null

  return (
    <div
      data-drag-count-badge
      className="fixed pointer-events-none z-[9999] select-none"
      style={{ left: mousePosition.x, top: mousePosition.y }}
    >
      {/* Faded, transparent echo image of the first dragged package (Windows-style ghost preview) */}
      <div
        data-drag-echo-image
        className="relative w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden opacity-50 shadow-2xl border border-white/25 ring-1 ring-black/30"
      >
        <div className="absolute inset-0" style={{ background: getGradient(firstFilename) }} />
        {thumbUrl && <div className="absolute inset-0 bg-elevated" />}
        {thumbUrl && <img src={thumbUrl} className="thumb absolute inset-0 w-full h-full object-cover" alt="" />}
      </div>

      {/* Number badge beside the mouse indicating how many files are being dragged/moved */}
      <div className="absolute left-3.5 top-2.5 flex items-center gap-1.5">
        <span className="flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-bold rounded-full bg-accent-blue text-white shadow-xl ring-2 ring-surface shrink-0">
          {count}
        </span>
        {folderName ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface/95 border border-accent-blue/40 text-text-primary text-xs shadow-md backdrop-blur-sm whitespace-nowrap">
            <FolderDown size={12} className="text-accent-blue shrink-0" />
            <span className="font-semibold text-accent-blue truncate max-w-[200px]">→ {folderName}</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
// [AddOn] DragnDrop_End
