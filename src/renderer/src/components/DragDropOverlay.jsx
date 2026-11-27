// [AddOn] DragnDrop_Begin
import { useDragDropState, DragDropAddon } from '@/addons/dragDropAddon'
import { FolderDown } from 'lucide-react'

/**
 * Floating drag preview overlay element.
 * Displays a number badge beside the mouse cursor indicating how many files are being dragged/moved.
 */
export function DragDropOverlay() {
  const { isDragging, draggedPackages, hoveredLocation, mousePosition } = useDragDropState()

  if (!isDragging || draggedPackages.length === 0) return null

  const count = draggedPackages.length
  const folderName = hoveredLocation ? DragDropAddon.formatFolderLabel(hoveredLocation) : null

  return (
    <div
      data-drag-count-badge
      className="fixed pointer-events-none z-[9999] flex items-center gap-1.5 select-none"
      style={{ left: mousePosition.x + 14, top: mousePosition.y + 10 }}
    >
      {/* Number badge beside the mouse indicating how many files are being dragged/moved */}
      <span className="flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-bold rounded-full bg-accent-blue text-white shadow-xl ring-2 ring-surface shrink-0">
        {count}
      </span>
      {folderName ? (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface/95 border border-accent-blue/40 text-text-primary text-xs shadow-md backdrop-blur-sm">
          <FolderDown size={12} className="text-accent-blue shrink-0" />
          <span className="font-semibold text-accent-blue truncate max-w-[200px]">→ {folderName}</span>
        </span>
      ) : null}
    </div>
  )
}
// [AddOn] DragnDrop_End
