// [AddOn] FolderFilter_Begin
import { describe, it, expect } from 'vitest'
import { FolderFilterAddon } from '../addons/folderFilterAddon'

describe('FolderFilterAddon', () => {
  it('extracts top-level subfolder from subpath correctly', () => {
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: 'Folder1/SubFolder2' })).toBe('Folder1')
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: 'Folder1' })).toBe('Folder1')
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: '' })).toBe('')
    expect(FolderFilterAddon.getFirstSubfolder(null)).toBe('')
  })

  it('validates location filter string', () => {
    expect(FolderFilterAddon.isValidLocationFilter('all')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded:1')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded:1:Folder1')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('invalid')).toBe(false)
  })

  it('matches packages by location filter', () => {
    const pkgMain = { filename: 'a.var', libraryDirId: null, storageState: 'enabled' }
    const pkgOffload1 = { filename: 'b.var', libraryDirId: 1, subpath: 'Folder1', storageState: 'offloaded' }
    const pkgOffload2 = { filename: 'c.var', libraryDirId: 2, subpath: 'Folder2/Deep', storageState: 'offloaded' }

    expect(FolderFilterAddon.matchesLocationFilter(pkgMain, 'all')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgMain, 'offloaded')).toBe(false)

    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:2')).toBe(false)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder1')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder2')).toBe(false)

    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload2, 'offloaded:2:Folder2')).toBe(true)
  })

  it('calculates counts and builds filter panel items', () => {
    const auxDirs = [
      { id: 1, label: 'Offload A', path: '/path/offloadA' },
      { id: 2, label: 'Offload B', path: '/path/offloadB' },
    ]

    const packages = [
      { filename: '1.var', libraryDirId: null, storageState: 'enabled' },
      { filename: '2.var', libraryDirId: 1, subpath: 'Folder1', storageState: 'offloaded' },
      { filename: '3.var', libraryDirId: 1, subpath: 'Folder1/Nested', storageState: 'offloaded' },
      { filename: '4.var', libraryDirId: 1, subpath: 'Folder2', storageState: 'offloaded' },
      { filename: '5.var', libraryDirId: 2, subpath: '', storageState: 'offloaded' },
    ]

    const counts = FolderFilterAddon.calculateLocationCounts(packages)
    expect(counts.all).toBe(5)
    expect(counts.offloaded).toBe(4)
    expect(counts.offloadedByDir['1']).toBe(3)
    expect(counts.offloadedByDir['2']).toBe(1)
    expect(counts.offloadedBySubfolder['1:Folder1']).toBe(2)
    expect(counts.offloadedBySubfolder['1:Folder2']).toBe(1)

    const items = FolderFilterAddon.buildLocationFilterItems(auxDirs, counts)
    expect(items).toEqual([
      { value: 'all', label: 'All', count: 5 },
      { value: 'offloaded', label: 'Offloaded', count: 4 },
      { value: 'offloaded:1', label: 'Offload A', count: 3, level: 1 },
      { value: 'offloaded:1:Folder1', label: 'Folder1', count: 2, level: 2 },
      { value: 'offloaded:1:Folder2', label: 'Folder2', count: 1, level: 2 },
      { value: 'offloaded:2', label: 'Offload B', count: 1, level: 1 },
    ])
  })

  it('retains subfolders with 0 count when filtering by Enabled state', () => {
    const auxDirs = [{ id: 1, label: 'Offload A', path: '/path/offloadA' }]

    const allPackages = [
      { filename: '1.var', libraryDirId: null, storageState: 'enabled' },
      { filename: '2.var', libraryDirId: 1, subpath: 'Cloths', storageState: 'offloaded' },
      { filename: '3.var', libraryDirId: 1, subpath: 'Girls', storageState: 'offloaded' },
    ]

    // Filtering by Enabled gives only item 1 in filteredPackages
    const enabledPackages = allPackages.filter((p) => p.storageState === 'enabled')

    const counts = FolderFilterAddon.calculateLocationCounts(enabledPackages, allPackages)
    expect(counts.all).toBe(1)
    expect(counts.offloaded).toBe(0)
    expect(counts.offloadedByDir['1']).toBeUndefined()
    expect(counts.offloadedBySubfolder['1:Cloths']).toBeUndefined()

    const items = FolderFilterAddon.buildLocationFilterItems(auxDirs, counts)
    expect(items).toEqual([
      { value: 'all', label: 'All', count: 1 },
      { value: 'offloaded', label: 'Offloaded', count: 0 },
      { value: 'offloaded:1', label: 'Offload A', count: 0, level: 1 },
      { value: 'offloaded:1:Cloths', label: 'Cloths', count: 0, level: 2 },
      { value: 'offloaded:1:Girls', label: 'Girls', count: 0, level: 2 },
    ])
  })
})
// [AddOn] FolderFilter_End
