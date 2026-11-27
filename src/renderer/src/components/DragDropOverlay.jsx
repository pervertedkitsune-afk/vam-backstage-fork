// [AddOn] DragnDrop_Begin
import { useDragDropState, DragDropAddon } from '@/addons/dragDropAddon'
import { FolderDown } from 'lucide-react'

/**
 * Floating drag preview overlay element.
 */
export function DragDropOverlay() {
  const { isDragging, draggedPackages, hoveredLocation, mousePosition, previewPkg } = useDragDropState()

  if (!isDragging || draggedPackages.length === 0) return null

  const count = draggedPackages.length
  const folderName = hoveredLocation ? DragDropAddon.formatFolderLabel(hoveredLocation) : null

  return (
    <div
      className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-3 py-2 rounded-lg bg-surface/95 border-2 border-accent-blue shadow-2xl backdrop-blur-md text-xs font-medium text-text-primary select-none -translate-x-1/2 -translate-y-1/2"
      style={{ left: mousePosition.x, top: mousePosition.y }}
    >
      <FolderDown size={16} className="text-accent-blue shrink-0 animate-bounce" />
      <span>{count === 1 ? `Moving "${previewPkg?.filename || draggedPackages[0]}"` : `Moving ${count} packages`}</span>
      {folderName ? (
        <span className="text-accent-blue font-bold ml-1 flex items-center gap-1">
          <span>→</span>
          <span>{folderName}</span>
        </span>
      ) : (
        <span className="text-text-tertiary text-[11px] ml-1">(Drop on a folder under Locations)</span>
      )}
    </div>
  )
}
// [AddOn] DragnDrop_End
