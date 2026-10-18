// [AddOn] ArchiveUniquePackages_Begin
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ArchiveUniquePackagesAddon } from './archiveUniquePackagesAddon.js'
import { getSetting, setStorageState, setPackageDirect, forgetDeletedData } from '../db.js'
import { pkgVarPath } from '../library-dirs.js'
import { runLocalScan } from '../scanner/local.js'
import { buildFromDb } from '../store.js'

vi.mock('../db.js', () => ({
  getSetting: vi.fn(),
  setStorageState: vi.fn(),
  setPackageDirect: vi.fn(),
  forgetDeletedData: vi.fn(),
}))

vi.mock('../library-dirs.js', () => ({
  pkgVarPath: vi.fn(),
}))

vi.mock('../scanner/local.js', () => ({
  runLocalScan: vi.fn().mockResolvedValue({}),
}))

vi.mock('../store.js', () => ({
  buildFromDb: vi.fn(),
}))

vi.mock('../notify.js', () => ({
  notify: vi.fn(),
}))

vi.mock('../watcher.js', () => ({
  recordOwnedPath: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockRejectedValue(new Error('ENOENT')),
  copyFile: vi.fn().mockResolvedValue(undefined),
}))

describe('ArchiveUniquePackagesAddon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNonHubDirectory', () => {
    it('returns trimmed directory path when setting is configured', () => {
      vi.mocked(getSetting).mockReturnValue('  /custom/non_hub_folder  ')
      expect(ArchiveUniquePackagesAddon.getNonHubDirectory()).toBe('/custom/non_hub_folder')
    })

    it('returns null when setting is empty or undefined', () => {
      vi.mocked(getSetting).mockReturnValue('')
      expect(ArchiveUniquePackagesAddon.getNonHubDirectory()).toBeNull()

      vi.mocked(getSetting).mockReturnValue(null)
      expect(ArchiveUniquePackagesAddon.getNonHubDirectory()).toBeNull()
    })
  })

  // [AddOn] DependencyFix_Begin
  describe('getFocusedDependencyFolder', () => {
    it('returns trimmed folder path when setting is configured', () => {
      vi.mocked(getSetting).mockReturnValue('  /focused/dep_folder  ')
      expect(ArchiveUniquePackagesAddon.getFocusedDependencyFolder()).toBe('/focused/dep_folder')
    })

    it('returns null when setting is empty or undefined', () => {
      vi.mocked(getSetting).mockReturnValue('')
      expect(ArchiveUniquePackagesAddon.getFocusedDependencyFolder()).toBeNull()
    })
  })
  // [AddOn] DependencyFix_End

  describe('isNonHubPackage', () => {
    it('returns true if filename is not in replaceableSet', () => {
      const replaceableSet = new Set(['Downloadable.Pkg.1.var'])
      expect(ArchiveUniquePackagesAddon.isNonHubPackage('Unique.Pkg.1.var', replaceableSet)).toBe(true)
    })

    it('returns false if filename is in replaceableSet', () => {
      const replaceableSet = new Set(['Downloadable.Pkg.1.var'])
      expect(ArchiveUniquePackagesAddon.isNonHubPackage('Downloadable.Pkg.1.var', replaceableSet)).toBe(false)
    })

    it('returns true if replaceableSet is null or empty', () => {
      expect(ArchiveUniquePackagesAddon.isNonHubPackage('Unique.Pkg.1.var', null)).toBe(true)
    })
  })

  describe('relocateNonHubPackage', () => {
    it('returns { ok: false } if nonHubDir is null or empty', async () => {
      const res = await ArchiveUniquePackagesAddon.relocateNonHubPackage({ filename: 'A.var' }, 'A.var', '')
      expect(res).toEqual({ ok: false })
    })

    it('relocates file and updates DB state to disabled', async () => {
      const pkg = { filename: 'Unique.1.var' }
      vi.mocked(pkgVarPath).mockReturnValue('/vam/AddonPackages/Unique.1.var')

      const res = await ArchiveUniquePackagesAddon.relocateNonHubPackage(pkg, 'Unique.1.var', '/non_hub')

      expect(res.ok).toBe(true)
      expect(res.movedTo).toBe('/non_hub/Unique.1.var')
      expect(setPackageDirect).toHaveBeenCalledWith('Unique.1.var', false)
      expect(setStorageState).toHaveBeenCalledWith('Unique.1.var', 'disabled', null, '/non_hub')
    })
  })

  describe('cleanupDatabase', () => {
    it('scans disk, cleans orphaned DB records, rebuilds store', async () => {
      vi.mocked(forgetDeletedData).mockReturnValue({ packages: 3, contentLabels: 1 })

      const res = await ArchiveUniquePackagesAddon.cleanupDatabase('/vam')

      expect(runLocalScan).toHaveBeenCalledWith('/vam')
      expect(forgetDeletedData).toHaveBeenCalled()
      expect(buildFromDb).toHaveBeenCalled()
      expect(res).toEqual({ ok: true, removedPackages: 3, removedContentLabels: 1 })
    })
  })
})
// [AddOn] ArchiveUniquePackages_End
