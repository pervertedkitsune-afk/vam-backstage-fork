// [AddOn] DragnDrop_Begin
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DragDropAddon } from './dragDropAddon.js'

vi.mock('../storage-state.js', () => ({
  applyStorageState: vi.fn(),
}))

vi.mock('../library-dirs.js', () => ({
  getAuxLibraryDirs: vi.fn(),
  getMainLibraryDirPath: vi.fn(),
}))

vi.mock('../store.js', () => ({
  buildFromDb: vi.fn(),
}))

vi.mock('../notify.js', () => ({
  notify: vi.fn(),
}))

import { applyStorageState } from '../storage-state.js'
import { getAuxLibraryDirs } from '../library-dirs.js'
import { buildFromDb } from '../store.js'
import { notify } from '../notify.js'

describe('DragDropAddon (Main)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuxLibraryDirs).mockReturnValue([
      { id: 1, path: '/aux1', archive: false },
      { id: 2, path: '/aux2', archive: false },
      { id: 3, path: '/aux3_archive', archive: true },
    ])
  })

  describe('parseTargetLocation', () => {
    it('returns null for null, undefined, or empty string', () => {
      expect(DragDropAddon.parseTargetLocation(null)).toBeNull()
      expect(DragDropAddon.parseTargetLocation(undefined)).toBeNull()
      expect(DragDropAddon.parseTargetLocation('')).toBeNull()
      expect(DragDropAddon.parseTargetLocation('all')).toBeNull()
    })

    it('parses "offloaded" into the first non-archive aux directory', () => {
      const parsed = DragDropAddon.parseTargetLocation('offloaded')
      expect(parsed).toEqual({
        dirId: 1,
        subpath: '',
        storageState: 'offloaded',
      })
    })

    it('returns null for "offloaded" when no valid aux dirs exist', () => {
      vi.mocked(getAuxLibraryDirs).mockReturnValue([{ id: 3, archive: true }])
      expect(DragDropAddon.parseTargetLocation('offloaded')).toBeNull()
    })

    it('parses "offloaded:<dirId>" into root of that aux directory', () => {
      const parsed = DragDropAddon.parseTargetLocation('offloaded:2')
      expect(parsed).toEqual({
        dirId: 2,
        subpath: '',
        storageState: 'offloaded',
      })
    })

    it('parses "offloaded:<dirId>:<subpath>" into subfolder', () => {
      const parsed = DragDropAddon.parseTargetLocation('offloaded:2:Poses/Sitting')
      expect(parsed).toEqual({
        dirId: 2,
        subpath: 'Poses/Sitting',
        storageState: 'offloaded',
      })
    })

    it('returns null when dirId is not a number', () => {
      expect(DragDropAddon.parseTargetLocation('offloaded:invalid')).toBeNull()
    })
  })

  describe('movePackagesToLocation', () => {
    it('returns error if target location is invalid', async () => {
      const res = await DragDropAddon.movePackagesToLocation(['pkg1.var'], 'invalid_location')
      expect(res.ok).toBe(false)
      expect(res.movedCount).toBe(0)
      expect(res.error).toBeDefined()
    })

    it('returns { ok: true, movedCount: 0 } for empty filenames array', async () => {
      const res = await DragDropAddon.movePackagesToLocation([], 'offloaded:1')
      expect(res.ok).toBe(true)
      expect(res.movedCount).toBe(0)
    })

    it('moves multiple packages directly to the specified folder and updates store', async () => {
      vi.mocked(applyStorageState).mockResolvedValue({ ok: true })

      const filenames = ['Author.PkgA.1.var', 'Author.PkgB.1.var']
      const res = await DragDropAddon.movePackagesToLocation(filenames, 'offloaded:1:Poses/Female')

      expect(res.ok).toBe(true)
      expect(res.movedCount).toBe(2)
      expect(res.targetDirId).toBe(1)
      expect(res.targetSubpath).toBe('Poses/Female')

      expect(applyStorageState).toHaveBeenCalledTimes(2)
      expect(applyStorageState).toHaveBeenNthCalledWith(
        1,
        'Author.PkgA.1.var',
        { storageState: 'offloaded', libraryDirId: 1 },
        { targetSubpath: 'Poses/Female' },
      )
      expect(applyStorageState).toHaveBeenNthCalledWith(
        2,
        'Author.PkgB.1.var',
        { storageState: 'offloaded', libraryDirId: 1 },
        { targetSubpath: 'Poses/Female' },
      )

      expect(notify).toHaveBeenCalledWith('moving:progress', expect.objectContaining({ filename: 'Author.PkgA.1.var' }))
      expect(notify).toHaveBeenCalledWith('packages:updated')
      expect(buildFromDb).toHaveBeenCalled()
    })

    it('continues moving remaining packages if one fails', async () => {
      vi.mocked(applyStorageState)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce({ ok: true })

      const res = await DragDropAddon.movePackagesToLocation(['Fail.1.var', 'Success.1.var'], 'offloaded:1')
      expect(res.ok).toBe(true)
      expect(res.movedCount).toBe(1)
      expect(buildFromDb).toHaveBeenCalled()
    })
  })
})
// [AddOn] DragnDrop_End
