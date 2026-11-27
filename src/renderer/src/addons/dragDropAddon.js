// [AddOn] DragnDrop_Begin
import { useSyncExternalStore } from 'react'

const listeners = new Set()

const state = {
  isArmed: false,
  isDragging: false,
  draggedPackages: [],
  previewPkg: null,
  mousePosition: { x: 0, y: 0 },
  hoveredLocation: null,
  activeTimer: null,
}

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

/**
 * Hook to subscribe to drag-and-drop state.
 */
export function useDragDropState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/**
 * AddOn class to handle hold-to-drag packages into folders listed under Locations.
 */
export class DragDropAddon {
  static HOLD_DURATION = 2000 // 2 seconds hold threshold

  /**
   * Check if a target location string is a valid drop destination under Locations.
   * @param {string} targetLocation
   * @returns {boolean}
   */
  static isValidTarget(targetLocation) {
    if (!targetLocation || typeof targetLocation !== 'string') return false
    if (targetLocation === 'all') return false
    return targetLocation === 'offloaded' || targetLocation.startsWith('offloaded:')
  }

  /**
   * Format target location string for human-readable display.
   * @param {string} targetLocation
   * @returns {string}
   */
  static formatFolderLabel(targetLocation) {
    if (!targetLocation) return ''
    if (targetLocation === 'offloaded') return 'Offload Root'
    if (targetLocation.startsWith('offloaded:')) {
      const parts = targetLocation.slice('offloaded:'.length).split(':')
      if (parts.length > 1) {
        return parts.slice(1).join('/')
      }
      return `Offload ${parts[0]}`
    }
    return targetLocation
  }

  /**
   * Get formatted success message after move.
   * @param {number} count
   * @param {string} targetLocation
   * @returns {string}
   */
  static getMoveSuccessMessage(count, targetLocation) {
    const folder = DragDropAddon.formatFolderLabel(targetLocation)
    if (count === 1) {
      return `Moved 1 package to "${folder}"`
    }
    return `Moved ${count} packages to "${folder}"`
  }

  /**
   * Check if currently dragging.
   * @returns {boolean}
   */
  static isDragging() {
    return state.isDragging
  }

  // [AddOn] DragnDrop_Begin
  /**
   * Get current drag state.
   * @returns {object}
   */
  static getState() {
    return { ...state }
  }
  // [AddOn] DragnDrop_End

  /**
   * Set the currently hovered location folder target.
   * @param {string} targetLocation
   */
  static setHoveredTarget(targetLocation) {
    if (state.isDragging && DragDropAddon.isValidTarget(targetLocation)) {
      if (state.hoveredLocation !== targetLocation) {
        state.hoveredLocation = targetLocation
        emitChange()
      }
    }
  }

  /**
   * Clear hovered target if it matches.
   * @param {string} targetLocation
   */
  static clearHoveredTarget(targetLocation) {
    if (state.hoveredLocation === targetLocation) {
      state.hoveredLocation = null
      emitChange()
    }
  }

  /**
   * Reset all drag states.
   */
  static resetState() {
    if (state.activeTimer) {
      clearTimeout(state.activeTimer)
      state.activeTimer = null
    }
    state.isArmed = false
    state.isDragging = false
    state.draggedPackages = []
    state.previewPkg = null
    state.hoveredLocation = null
    emitChange()
  }

  /**
   * Handle mousedown on a package card or row to trigger hold-for-2s drag.
   * @param {object} pkg - Package data object.
   * @param {MouseEvent} e - Mouse down event.
   * @param {object} options - Options containing selectedFilenames, toast, onMoveComplete.
   */
  static handleMouseDown(pkg, e, options = {}) {
    if (e.button !== 0) return // Left click only

    const startX = e.clientX
    const startY = e.clientY

    // Determine target packages: if pkg is in mass selection, drag all selected; otherwise drag this one.
    const selected = options.selectedFilenames || []
    const targetPackages = selected.includes(pkg.filename) ? [...selected] : [pkg.filename]

    if (state.activeTimer) {
      clearTimeout(state.activeTimer)
    }

    // [AddOn] DragnDrop_Begin
    const win = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
    if (!win) return

    const onMove = (moveEvt) => {
      const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY)
      if (dist > 8) {
        // Cancel timer if user moved mouse more than threshold before 2 seconds
        if (state.activeTimer) {
          clearTimeout(state.activeTimer)
          state.activeTimer = null
        }
        win.removeEventListener('mousemove', onMove)
        win.removeEventListener('mouseup', onUp)
      }
    }

    const onUp = () => {
      // Mouse released before 2s - cancel timer
      if (state.activeTimer) {
        clearTimeout(state.activeTimer)
        state.activeTimer = null
      }
      win.removeEventListener('mousemove', onMove)
      win.removeEventListener('mouseup', onUp)
    }

    win.addEventListener('mousemove', onMove)
    win.addEventListener('mouseup', onUp)

    // Trigger drag only if mouse held for 2 seconds
    state.activeTimer = setTimeout(() => {
      state.activeTimer = null
      win.removeEventListener('mousemove', onMove)
      win.removeEventListener('mouseup', onUp)

      state.isArmed = true
      state.isDragging = true
      state.draggedPackages = targetPackages
      state.previewPkg = pkg
      state.mousePosition = { x: startX, y: startY }
      state.hoveredLocation = null
      emitChange()

      const onGlobalMove = (gMoveEvt) => {
        state.mousePosition = { x: gMoveEvt.clientX, y: gMoveEvt.clientY }
        if (typeof document !== 'undefined') {
          const el = document.elementFromPoint(gMoveEvt.clientX, gMoveEvt.clientY)
          const folderEl = el?.closest?.('[data-location-folder]')
          const targetLoc = folderEl?.getAttribute?.('data-location-folder') || null
          state.hoveredLocation = DragDropAddon.isValidTarget(targetLoc) ? targetLoc : null
        }
        emitChange()
      }

      const onGlobalUp = () => {
        win.removeEventListener('mousemove', onGlobalMove)
        win.removeEventListener('mouseup', onGlobalUp)
        win.removeEventListener('keydown', onGlobalKey)

        const dropTarget = state.hoveredLocation
        const pkgsToMove = [...state.draggedPackages]

        DragDropAddon.resetState()

        if (dropTarget && pkgsToMove.length > 0 && DragDropAddon.isValidTarget(dropTarget)) {
          void DragDropAddon.executeMove(pkgsToMove, dropTarget, options)
        }
      }

      const onGlobalKey = (keyEvt) => {
        if (keyEvt.key === 'Escape') {
          win.removeEventListener('mousemove', onGlobalMove)
          win.removeEventListener('mouseup', onGlobalUp)
          win.removeEventListener('keydown', onGlobalKey)
          DragDropAddon.resetState()
        }
      }

      win.addEventListener('mousemove', onGlobalMove)
      win.addEventListener('mouseup', onGlobalUp)
      win.addEventListener('keydown', onGlobalKey)
    }, DragDropAddon.HOLD_DURATION)
    // [AddOn] DragnDrop_End
  }

  /**
   * Execute package move to destination folder via API.
   * @param {string[]} filenames
   * @param {string} targetLocation
   * @param {object} options
   */
  static async executeMove(filenames, targetLocation, options = {}) {
    if (!filenames || filenames.length === 0 || !DragDropAddon.isValidTarget(targetLocation)) {
      return
    }

    try {
      if (typeof window !== 'undefined' && window.api?.packages?.moveToLocation) {
        const res = await window.api.packages.moveToLocation(filenames, targetLocation)
        if (res?.ok) {
          const msg = DragDropAddon.getMoveSuccessMessage(res.movedCount ?? filenames.length, targetLocation)
          options.toast?.(msg, 'success')
          options.onMoveComplete?.()
        } else {
          options.toast?.(`Failed to move: ${res?.error || 'Unknown error'}`, 'error')
        }
      }
    } catch (err) {
      console.error('[DragDropAddon] Move execution failed:', err)
      options.toast?.(`Failed to move: ${err.message}`, 'error')
    }
  }

  /**
   * Handle drop directly onto a folder element.
   * @param {string} targetLocation
   * @param {MouseEvent} e
   * @param {object} options
   */
  static handleDrop(targetLocation, e, options = {}) {
    if (state.isDragging && DragDropAddon.isValidTarget(targetLocation)) {
      e?.preventDefault?.()
      e?.stopPropagation?.()
      const pkgsToMove = [...state.draggedPackages]
      DragDropAddon.resetState()
      void DragDropAddon.executeMove(pkgsToMove, targetLocation, options)
    }
  }
}
// [AddOn] DragnDrop_End
