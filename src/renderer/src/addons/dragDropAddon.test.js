// [AddOn] DragnDrop_Begin
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DragDropAddon } from './dragDropAddon.js'

describe('DragDropAddon (Renderer)', () => {
  let listenersMap = new Map()

  beforeEach(() => {
    vi.useFakeTimers()
    listenersMap = new Map()
    const mockWindow = {
      addEventListener: vi.fn((event, cb) => {
        if (!listenersMap.has(event)) listenersMap.set(event, new Set())
        listenersMap.get(event).add(cb)
      }),
      removeEventListener: vi.fn((event, cb) => {
        listenersMap.get(event)?.delete(cb)
      }),
      dispatchEvent: vi.fn((event) => {
        listenersMap.get(event.type)?.forEach((cb) => cb(event))
      }),
      api: {
        packages: {
          moveToLocation: vi.fn().mockResolvedValue({ ok: true, movedCount: 1 }),
        },
      },
    }
    globalThis.window = mockWindow
    DragDropAddon.resetState()
  })

  afterEach(() => {
    DragDropAddon.resetState()
    vi.useRealTimers()
  })

  describe('isValidTarget', () => {
    it('returns true for valid offloaded targets', () => {
      expect(DragDropAddon.isValidTarget('offloaded')).toBe(true)
      expect(DragDropAddon.isValidTarget('offloaded:1')).toBe(true)
      expect(DragDropAddon.isValidTarget('offloaded:2:Poses/Sitting')).toBe(true)
    })

    it('returns false for invalid targets', () => {
      expect(DragDropAddon.isValidTarget('all')).toBe(false)
      expect(DragDropAddon.isValidTarget(null)).toBe(false)
      expect(DragDropAddon.isValidTarget(undefined)).toBe(false)
      expect(DragDropAddon.isValidTarget('')).toBe(false)
      expect(DragDropAddon.isValidTarget('unknown')).toBe(false)
    })
  })

  describe('formatFolderLabel & getMoveSuccessMessage', () => {
    it('formats folder labels nicely', () => {
      expect(DragDropAddon.formatFolderLabel('offloaded')).toBe('Offload Root')
      expect(DragDropAddon.formatFolderLabel('offloaded:1')).toBe('Offload 1')
      expect(DragDropAddon.formatFolderLabel('offloaded:1:Poses/Standing')).toBe('Poses/Standing')
    })

    it('generates singular and plural success messages', () => {
      expect(DragDropAddon.getMoveSuccessMessage(1, 'offloaded:1:Poses')).toBe('Moved 1 package to "Poses"')
      expect(DragDropAddon.getMoveSuccessMessage(3, 'offloaded:1:Poses')).toBe('Moved 3 packages to "Poses"')
    })
  })

  describe('1-second hold trigger', () => {
    it('does not trigger drag if mouse is released before 1 second', () => {
      const pkg = { filename: 'PkgA.1.var' }
      const e = { button: 0, clientX: 100, clientY: 100 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: [] })

      expect(DragDropAddon.isDragging()).toBe(false)

      // Advance by 500ms
      vi.advanceTimersByTime(500)
      expect(DragDropAddon.isDragging()).toBe(false)

      // Mouse up before 1s
      listenersMap.get('mouseup')?.forEach((cb) => cb({ clientX: 100, clientY: 100 }))

      // Advance past 1s
      vi.advanceTimersByTime(1000)
      expect(DragDropAddon.isDragging()).toBe(false)
    })

    it('cancels drag if mouse moves > 8px before 1 second', () => {
      const pkg = { filename: 'PkgA.1.var' }
      const e = { button: 0, clientX: 100, clientY: 100 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: [] })

      // Advance by 500ms
      vi.advanceTimersByTime(500)

      // Move mouse by 20px
      listenersMap.get('mousemove')?.forEach((cb) => cb({ clientX: 120, clientY: 100 }))

      // Advance past 1s
      vi.advanceTimersByTime(1000)
      expect(DragDropAddon.isDragging()).toBe(false)
    })

    it('triggers drag if mouse is held down for 1 second', () => {
      const pkg = { filename: 'PkgA.1.var' }
      const e = { button: 0, clientX: 100, clientY: 100 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: [] })

      expect(DragDropAddon.isDragging()).toBe(false)

      // Advance timer by exactly 1000ms
      vi.advanceTimersByTime(1000)

      expect(DragDropAddon.isDragging()).toBe(true)
    })

    it('mass selection: drags all selected packages if clicked package is in selection', () => {
      const pkg = { filename: 'PkgB.1.var' }
      const selected = ['PkgA.1.var', 'PkgB.1.var', 'PkgC.1.var']
      const e = { button: 0, clientX: 100, clientY: 100 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: selected })
      vi.advanceTimersByTime(1000)

      expect(DragDropAddon.isDragging()).toBe(true)
    })

    it('single selection: drags only clicked package if not in mass selection', () => {
      const pkg = { filename: 'PkgX.1.var' }
      const selected = ['PkgA.1.var', 'PkgB.1.var']
      const e = { button: 0, clientX: 100, clientY: 100 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: selected })
      vi.advanceTimersByTime(1000)

      expect(DragDropAddon.isDragging()).toBe(true)
    })

    // [AddOn] DragnDrop_Begin
    it('sets drag count and position accurately for the number badge', () => {
      const pkg = { filename: 'PkgA.1.var' }
      const selected = ['PkgA.1.var', 'PkgB.1.var', 'PkgC.1.var']
      const e = { button: 0, clientX: 200, clientY: 150 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: selected })
      vi.advanceTimersByTime(1000)

      expect(DragDropAddon.isDragging()).toBe(true)
      const st = DragDropAddon.getState()
      expect(st.draggedPackages).toEqual(['PkgA.1.var', 'PkgB.1.var', 'PkgC.1.var'])
      expect(st.draggedPackages.length).toBe(3)
      expect(st.mousePosition).toEqual({ x: 200, y: 150 })
    })

    it('returns the first dragged package filename for the echo preview image', () => {
      expect(DragDropAddon.getFirstDraggedPackage()).toBeNull()

      const pkg = { filename: 'PkgB.1.var' }
      const selected = ['PkgA.1.var', 'PkgB.1.var', 'PkgC.1.var']
      const e = { button: 0, clientX: 120, clientY: 140 }

      DragDropAddon.handleMouseDown(pkg, e, { selectedFilenames: selected })
      vi.advanceTimersByTime(1000)

      expect(DragDropAddon.getFirstDraggedPackage()).toBe('PkgA.1.var')

      DragDropAddon.resetState()
      expect(DragDropAddon.getFirstDraggedPackage()).toBeNull()
    })
    // [AddOn] DragnDrop_End
  })

  describe('executeMove & handleDrop', () => {
    it('calls window.api.packages.moveToLocation and invokes callbacks', async () => {
      const toast = vi.fn()
      const onMoveComplete = vi.fn()

      await DragDropAddon.executeMove(['PkgA.1.var'], 'offloaded:1:Poses', { toast, onMoveComplete })

      expect(window.api.packages.moveToLocation).toHaveBeenCalledWith(['PkgA.1.var'], 'offloaded:1:Poses')
      expect(toast).toHaveBeenCalledWith('Moved 1 package to "Poses"', 'success')
      expect(onMoveComplete).toHaveBeenCalled()
    })

    it('handles API errors gracefully with error toast', async () => {
      window.api.packages.moveToLocation.mockResolvedValueOnce({ ok: false, error: 'Disk full' })
      const toast = vi.fn()

      await DragDropAddon.executeMove(['PkgA.1.var'], 'offloaded:1', { toast })

      expect(toast).toHaveBeenCalledWith('Failed to move: Disk full', 'error')
    })
  })
})
// [AddOn] DragnDrop_End
