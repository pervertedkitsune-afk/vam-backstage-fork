// [AddOn] FolderFilter_Begin
import { describe, it, expect } from 'vitest'
import { FolderFilterAddon } from '../addons/folderFilterAddon'

describe('FolderFilterAddon', () => {
  it('extracts top-level and second-level subfolders from subpath correctly', () => {
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: 'Folder1/SubFolder2/Deep' })).toBe('Folder1')
    expect(FolderFilterAddon.getSecondSubfolder({ subpath: 'Folder1/SubFolder2/Deep' })).toBe('Folder1/SubFolder2')
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: 'Folder1' })).toBe('Folder1')
    expect(FolderFilterAddon.getSecondSubfolder({ subpath: 'Folder1' })).toBe('')
    expect(FolderFilterAddon.getFirstSubfolder({ subpath: '' })).toBe('')
    expect(FolderFilterAddon.getSecondSubfolder({ subpath: '' })).toBe('')
    expect(FolderFilterAddon.getFirstSubfolder(null)).toBe('')
    expect(FolderFilterAddon.getSecondSubfolder(null)).toBe('')
  })

  it('validates location filter string', () => {
    expect(FolderFilterAddon.isValidLocationFilter('all')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded:1')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded:1:Folder1')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('offloaded:1:Folder1/SubFolder2')).toBe(true)
    expect(FolderFilterAddon.isValidLocationFilter('invalid')).toBe(false)
  })

  it('matches packages by location filter', () => {
    const pkgMain = { filename: 'a.var', libraryDirId: null, storageState: 'enabled' }
    const pkgOffload1 = { filename: 'b.var', libraryDirId: 1, subpath: 'Folder1/SubFolder2', storageState: 'offloaded' }
    const pkgOffload2 = { filename: 'c.var', libraryDirId: 2, subpath: 'Folder2/Deep/Sub', storageState: 'offloaded' }

    expect(FolderFilterAddon.matchesLocationFilter(pkgMain, 'all')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgMain, 'offloaded')).toBe(false)

    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:2')).toBe(false)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder1')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder1/SubFolder2')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder1/SubFolder3')).toBe(false)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload1, 'offloaded:1:Folder2')).toBe(false)

    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload2, 'offloaded:2:Folder2')).toBe(true)
    expect(FolderFilterAddon.matchesLocationFilter(pkgOffload2, 'offloaded:2:Folder2/Deep')).toBe(true)
  })

  it('calculates counts and builds filter panel items with depth 2 nested folders', () => {
    const auxDirs = [
      { id: 1, label: 'Offload A', path: '/path/offloadA' },
      { id: 2, label: 'Offload B', path: '/path/offloadB' },
    ]

    const packages = [
      { filename: '1.var', libraryDirId: null, storageState: 'enabled' },
      { filename: '2.var', libraryDirId: 1, subpath: 'Folder1', storageState: 'offloaded' },
      { filename: '3.var', libraryDirId: 1, subpath: 'Folder1/SubFolderA', storageState: 'offloaded' },
      { filename: '4.var', libraryDirId: 1, subpath: 'Folder1/SubFolderA/Deep', storageState: 'offloaded' },
      { filename: '5.var', libraryDirId: 1, subpath: 'Folder1/SubFolderB', storageState: 'offloaded' },
      { filename: '6.var', libraryDirId: 1, subpath: 'Folder2', storageState: 'offloaded' },
      { filename: '7.var', libraryDirId: 2, subpath: '', storageState: 'offloaded' },
    ]

    const counts = FolderFilterAddon.calculateLocationCounts(packages)
    expect(counts.all).toBe(7)
    expect(counts.offloaded).toBe(6)
    expect(counts.offloadedByDir['1']).toBe(5)
    expect(counts.offloadedByDir['2']).toBe(1)
    expect(counts.offloadedBySubfolder['1:Folder1']).toBe(4)
    expect(counts.offloadedBySubfolder['1:Folder1/SubFolderA']).toBe(2)
    expect(counts.offloadedBySubfolder['1:Folder1/SubFolderB']).toBe(1)
    expect(counts.offloadedBySubfolder['1:Folder2']).toBe(1)

    const items = FolderFilterAddon.buildLocationFilterItems(auxDirs, counts)
    expect(items).toEqual([
      { value: 'all', label: 'All', count: 7, level: 0, hasChildren: false, parentValue: null },
      { value: 'offloaded', label: 'Offloaded', count: 6, level: 0, hasChildren: true, parentValue: null },
      { value: 'offloaded:1', label: 'Offload A', count: 5, level: 1, hasChildren: true, parentValue: 'offloaded' },
      {
        value: 'offloaded:1:Folder1',
        label: 'Folder1',
        count: 4,
        level: 2,
        hasChildren: true,
        parentValue: 'offloaded:1',
      },
      {
        value: 'offloaded:1:Folder1/SubFolderA',
        label: 'SubFolderA',
        count: 2,
        level: 3,
        hasChildren: false,
        parentValue: 'offloaded:1:Folder1',
      },
      {
        value: 'offloaded:1:Folder1/SubFolderB',
        label: 'SubFolderB',
        count: 1,
        level: 3,
        hasChildren: false,
        parentValue: 'offloaded:1:Folder1',
      },
      {
        value: 'offloaded:1:Folder2',
        label: 'Folder2',
        count: 1,
        level: 2,
        hasChildren: false,
        parentValue: 'offloaded:1',
      },
      { value: 'offloaded:2', label: 'Offload B', count: 1, level: 1, hasChildren: false, parentValue: 'offloaded' },
    ])
  })

  it('retains depth 1 & 2 subfolders with 0 count when filtering by Enabled state', () => {
    const auxDirs = [{ id: 1, label: 'Offload A', path: '/path/offloadA' }]

    const allPackages = [
      { filename: '1.var', libraryDirId: null, storageState: 'enabled' },
      { filename: '2.var', libraryDirId: 1, subpath: 'Cloths/Shirts', storageState: 'offloaded' },
      { filename: '3.var', libraryDirId: 1, subpath: 'Girls', storageState: 'offloaded' },
    ]

    // Filtering by Enabled gives only item 1 in filteredPackages
    const enabledPackages = allPackages.filter((p) => p.storageState === 'enabled')

    const counts = FolderFilterAddon.calculateLocationCounts(enabledPackages, allPackages)
    expect(counts.all).toBe(1)
    expect(counts.offloaded).toBe(0)
    expect(counts.offloadedByDir['1']).toBeUndefined()
    expect(counts.offloadedBySubfolder['1:Cloths']).toBeUndefined()
    expect(counts.offloadedBySubfolder['1:Cloths/Shirts']).toBeUndefined()

    const items = FolderFilterAddon.buildLocationFilterItems(auxDirs, counts)
    expect(items).toEqual([
      { value: 'all', label: 'All', count: 1, level: 0, hasChildren: false, parentValue: null },
      { value: 'offloaded', label: 'Offloaded', count: 0, level: 0, hasChildren: true, parentValue: null },
      { value: 'offloaded:1', label: 'Offload A', count: 0, level: 1, hasChildren: true, parentValue: 'offloaded' },
      {
        value: 'offloaded:1:Cloths',
        label: 'Cloths',
        count: 0,
        level: 2,
        hasChildren: true,
        parentValue: 'offloaded:1',
      },
      {
        value: 'offloaded:1:Cloths/Shirts',
        label: 'Shirts',
        count: 0,
        level: 3,
        hasChildren: false,
        parentValue: 'offloaded:1:Cloths',
      },
      {
        value: 'offloaded:1:Girls',
        label: 'Girls',
        count: 0,
        level: 2,
        hasChildren: false,
        parentValue: 'offloaded:1',
      },
    ])
  })

  it('counts and matches enabled packages using originalLibraryDirId at depth 2', () => {
    const auxDirs = [{ id: 1, label: 'Offload A', path: '/path/offloadA' }]

    const enabledPkgOrig = {
      filename: 'enabled_orig.var',
      libraryDirId: null,
      originalLibraryDirId: 1,
      subpath: 'Cloths/Shirts',
      storageState: 'enabled',
    }

    expect(FolderFilterAddon.getEffectiveLibraryDirId(enabledPkgOrig)).toBe(1)
    expect(FolderFilterAddon.matchesLocationFilter(enabledPkgOrig, 'offloaded:1:Cloths/Shirts')).toBe(true)

    const packages = [enabledPkgOrig]
    const counts = FolderFilterAddon.calculateLocationCounts(packages, packages)
    expect(counts.all).toBe(1)
    expect(counts.offloadedByDir['1']).toBe(1)
    expect(counts.offloadedBySubfolder['1:Cloths']).toBe(1)
    expect(counts.offloadedBySubfolder['1:Cloths/Shirts']).toBe(1)

    const items = FolderFilterAddon.buildLocationFilterItems(auxDirs, counts)
    expect(items).toEqual([
      { value: 'all', label: 'All', count: 1, level: 0, hasChildren: false, parentValue: null },
      { value: 'offloaded', label: 'Offloaded', count: 1, level: 0, hasChildren: true, parentValue: null },
      { value: 'offloaded:1', label: 'Offload A', count: 1, level: 1, hasChildren: true, parentValue: 'offloaded' },
      {
        value: 'offloaded:1:Cloths',
        label: 'Cloths',
        count: 1,
        level: 2,
        hasChildren: true,
        parentValue: 'offloaded:1',
      },
      {
        value: 'offloaded:1:Cloths/Shirts',
        label: 'Shirts',
        count: 1,
        level: 3,
        hasChildren: false,
        parentValue: 'offloaded:1:Cloths',
      },
    ])
  })

  it('handles persistent collapse states and filtering visible items', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }

    const items = [
      { value: 'all', level: 0, hasChildren: false, parentValue: null },
      { value: 'offloaded', level: 0, hasChildren: true, parentValue: null },
      { value: 'offloaded:1', level: 1, hasChildren: true, parentValue: 'offloaded' },
      { value: 'offloaded:1:Cloths', level: 2, hasChildren: false, parentValue: 'offloaded:1' },
    ]

    // Default state: all folders collapsed
    expect(FolderFilterAddon.isFolderCollapsed('offloaded')).toBe(true)
    expect(FolderFilterAddon.isFolderCollapsed('offloaded:1')).toBe(true)

    // With 'offloaded' collapsed, only top-level items ('all', 'offloaded') are visible
    let visible = FolderFilterAddon.filterVisibleItems(items)
    expect(visible.map((i) => i.value)).toEqual(['all', 'offloaded'])

    // Expand 'offloaded'
    FolderFilterAddon.setFolderCollapsed('offloaded', false)
    expect(FolderFilterAddon.isFolderCollapsed('offloaded')).toBe(false)

    // Now 'offloaded:1' is visible, but 'offloaded:1:Cloths' is hidden because 'offloaded:1' is still collapsed
    visible = FolderFilterAddon.filterVisibleItems(items)
    expect(visible.map((i) => i.value)).toEqual(['all', 'offloaded', 'offloaded:1'])

    // Expand all
    FolderFilterAddon.expandAllFolders(items)
    visible = FolderFilterAddon.filterVisibleItems(items)
    expect(visible.map((i) => i.value)).toEqual(['all', 'offloaded', 'offloaded:1', 'offloaded:1:Cloths'])

    // Collapse all
    FolderFilterAddon.collapseAllFolders(items)
    visible = FolderFilterAddon.filterVisibleItems(items)
    expect(visible.map((i) => i.value)).toEqual(['all', 'offloaded'])
  })
})
// [AddOn] FolderFilter_End
