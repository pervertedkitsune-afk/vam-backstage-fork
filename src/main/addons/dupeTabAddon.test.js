// [AddOn] DupeTab_Begin
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkTempVamDir, openTestDatabase } from '../../../test/fixtures/index.js'
import { DupeTabAddon } from './dupeTabAddon.js'
import { closeDatabase, getAllDuplicatePackages } from '../db.js'

let tmp

describe('DupeTabAddon', () => {
  beforeEach(async () => {
    tmp = await mkTempVamDir()
    await openTestDatabase(tmp.dbPath)
  })

  afterEach(async () => {
    closeDatabase()
    if (tmp) await tmp.cleanup()
    delete process.env.VAM_DB_PATH
  })

  it('correctly identifies duplicate files with identical package_name, creator, version, and size', () => {
    const files = [
      {
        filename: 'Author.Pkg.1.var',
        fullPath: '/path1/AddonPackages/Author.Pkg.1.var',
        size: 5000,
        mtime: 1000,
        storageState: 'enabled',
        libraryDirId: null,
        subpath: '',
      },
      {
        filename: 'Author.Pkg.1.var',
        fullPath: '/path2/Aux1/Author.Pkg.1.var',
        size: 5000,
        mtime: 1000,
        storageState: 'offloaded',
        libraryDirId: 1,
        subpath: '',
      },
      {
        filename: 'Author.Pkg.2.var',
        fullPath: '/path1/AddonPackages/Author.Pkg.2.var',
        size: 6000,
        mtime: 1200,
        storageState: 'enabled',
        libraryDirId: null,
        subpath: '',
      },
    ]

    const dupes = DupeTabAddon.findDuplicates(files)
    expect(dupes).toHaveLength(2)
    expect(dupes.map((d) => d.filePath)).toEqual([
      '/path1/AddonPackages/Author.Pkg.1.var',
      '/path2/Aux1/Author.Pkg.1.var',
    ])
  })

  it('syncs duplicates to database and groups them', () => {
    const files = [
      {
        filename: 'CreatorA.Item.1.var',
        fullPath: '/vam/AddonPackages/CreatorA.Item.1.var',
        size: 1024,
        mtime: 2000,
        storageState: 'enabled',
        libraryDirId: null,
        subpath: '',
      },
      {
        filename: 'CreatorA.Item.1.var',
        fullPath: '/storage/Offload/CreatorA.Item.1.var',
        size: 1024,
        mtime: 2000,
        storageState: 'offloaded',
        libraryDirId: 2,
        subpath: '',
      },
    ]

    const dupes = DupeTabAddon.findDuplicates(files)
    DupeTabAddon.syncDuplicates(dupes)

    const raw = getAllDuplicatePackages()
    expect(raw).toHaveLength(2)

    const grouped = DupeTabAddon.getGroupedDuplicates()
    expect(grouped).toHaveLength(1)
    expect(grouped[0].packageName).toBe('CreatorA.Item')
    expect(grouped[0].count).toBe(2)
    expect(grouped[0].items).toHaveLength(2)
  })

  it('identifies offloaded duplicates when an enabled copy exists', () => {
    const files = [
      {
        filename: 'CreatorA.Item.1.var',
        fullPath: '/vam/AddonPackages/CreatorA.Item.1.var',
        size: 1024,
        mtime: 2000,
        storageState: 'enabled',
        libraryDirId: null,
        subpath: '',
      },
      {
        filename: 'CreatorA.Item.1.var',
        fullPath: '/storage/Offload/CreatorA.Item.1.var',
        size: 1024,
        mtime: 2000,
        storageState: 'offloaded',
        libraryDirId: 2,
        subpath: '',
      },
    ]

    const dupes = DupeTabAddon.findDuplicates(files)
    DupeTabAddon.syncDuplicates(dupes)

    const offloadedToRemove = DupeTabAddon.getOffloadedDuplicatesWithEnabledCopy()
    expect(offloadedToRemove).toHaveLength(1)
    expect(offloadedToRemove[0].file_path).toBe('/storage/Offload/CreatorA.Item.1.var')
  })
})
// [AddOn] DupeTab_End
