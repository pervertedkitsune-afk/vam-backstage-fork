// [AddOn] LoadingAddon_Begin
import { describe, it, expect } from 'vitest'
import { LoadingAddon } from './loadingAddon.js'

describe('LoadingAddon', () => {
  describe('getOverallProgress', () => {
    it('returns 0 for empty items or no active/queued items', () => {
      expect(LoadingAddon.getOverallProgress([])).toBe(0)
      expect(LoadingAddon.getOverallProgress(null)).toBe(0)
      expect(
        LoadingAddon.getOverallProgress([
          { status: 'completed', progress: 100 },
          { status: 'failed', progress: 0 },
        ]),
      ).toBe(0)
    })

    it('calculates weighted overall progress correctly', () => {
      const items = [
        { status: 'completed', progress: 100, sizeBytes: 1000 },
        { status: 'active', progress: 50, sizeBytes: 1000 },
        { status: 'queued', progress: 0, sizeBytes: 1000 },
      ]
      // completed: 1000, active: 500, total: 3000 => 1500 / 3000 = 50%
      expect(LoadingAddon.getOverallProgress(items)).toBe(50)
    })

    it('falls back to default size when sizeBytes is missing', () => {
      const items = [
        { status: 'completed', progress: 100 },
        { status: 'active', progress: 40 },
      ]
      // 1.4 / 2.0 = 70%
      expect(LoadingAddon.getOverallProgress(items)).toBe(70)
    })
  })

  describe('isMovingActive', () => {
    it('returns true if any item is active or queued', () => {
      expect(LoadingAddon.isMovingActive([{ status: 'active' }])).toBe(true)
      expect(LoadingAddon.isMovingActive([{ status: 'queued' }])).toBe(true)
      expect(LoadingAddon.isMovingActive([{ status: 'completed' }, { status: 'failed' }])).toBe(false)
      expect(LoadingAddon.isMovingActive([])).toBe(false)
    })
  })

  describe('getActiveMovingDetails', () => {
    it('returns first active item details and overall progress', () => {
      const items = [
        { filename: 'pkg1.var', status: 'completed', progress: 100 },
        { filename: 'pkg2.var', type: 'move', status: 'active', progress: 60 },
        { filename: 'pkg3.var', type: 'activate', status: 'queued', progress: 0 },
      ]
      const details = LoadingAddon.getActiveMovingDetails(items)
      expect(details.activeItem.filename).toBe('pkg2.var')
      expect(details.activeCount).toBe(1)
      expect(details.queuedCount).toBe(1)
      expect(details.overallProgress).toBeGreaterThan(0)
    })

    it('falls back to queued item if none are active', () => {
      const items = [{ filename: 'pkg_queued.var', type: 'activate', status: 'queued', progress: 0 }]
      const details = LoadingAddon.getActiveMovingDetails(items)
      expect(details.activeItem.filename).toBe('pkg_queued.var')
      expect(details.activeCount).toBe(0)
      expect(details.queuedCount).toBe(1)
    })
  })

  describe('formatActionLabel', () => {
    it('formats correct label based on type', () => {
      expect(LoadingAddon.formatActionLabel({ type: 'activate' })).toBe('Enabling…')
      expect(LoadingAddon.formatActionLabel({ type: 'disable' })).toBe('Disabling…')
      expect(LoadingAddon.formatActionLabel({ type: 'archive' })).toBe('Archiving…')
      expect(LoadingAddon.formatActionLabel({ type: 'move' })).toBe('Moving…')
      expect(LoadingAddon.formatActionLabel(null)).toBe('Moving…')
    })
  })
})
// [AddOn] LoadingAddon_End
