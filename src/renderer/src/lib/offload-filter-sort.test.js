// [AddOn] Filter_Begin
import { describe, it, expect } from 'vitest'
import { FilterAddon } from '../addons/filterAddon'

describe('Offload Directory Filtering and Sorting with FilterAddon', () => {
  const pkgs = [
    { filename: 'A.var', storageState: 'enabled', libraryDirId: null, subpath: '' },
    { filename: 'B.var', storageState: 'disabled', libraryDirId: null, subpath: '' },
    { filename: 'C.var', storageState: 'offloaded', libraryDirId: 101, subpath: 'CNXN' },
    { filename: 'D.var', storageState: 'offloaded', libraryDirId: 101, subpath: 'CNXN/Dependencies' },
    { filename: 'E.var', storageState: 'offloaded', libraryDirId: 101, subpath: 'OtherFolder' },
    { filename: 'F.var', storageState: 'offloaded', libraryDirId: 102, subpath: '' },
  ]

  const auxDirs = [
    { id: 101, label: 'AddonPackages_Offload' },
    { id: 102, label: 'Directory Beta' },
  ]

  it('extracts top-level subfolder correctly', () => {
    expect(FilterAddon.getFirstSubfolder(pkgs[0])).toBe('')
    expect(FilterAddon.getFirstSubfolder(pkgs[2])).toBe('CNXN')
    expect(FilterAddon.getFirstSubfolder(pkgs[3])).toBe('CNXN')
    expect(FilterAddon.getFirstSubfolder(pkgs[4])).toBe('OtherFolder')
    expect(FilterAddon.getFirstSubfolder(pkgs[5])).toBe('')
  })

  it('filters packages by general storage state and specific offloaded directory/subfolder', () => {
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'all'))).toHaveLength(6)
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'enabled'))).toEqual([pkgs[0]])
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'disabled'))).toEqual([pkgs[1]])
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'offloaded'))).toEqual([
      pkgs[2],
      pkgs[3],
      pkgs[4],
      pkgs[5],
    ])
    // Parent offload dir matches all packages in dir 101
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'offloaded:101'))).toEqual([
      pkgs[2],
      pkgs[3],
      pkgs[4],
    ])
    // Nested subfolder filter matches only packages under CNXN in dir 101
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'offloaded:101:CNXN'))).toEqual([pkgs[2], pkgs[3]])
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'offloaded:101:OtherFolder'))).toEqual([pkgs[4]])
    expect(pkgs.filter((p) => FilterAddon.matchesPackageFilter(p, 'offloaded:102'))).toEqual([pkgs[5]])
  })

  it('calculates offload counts correctly for dirs and subfolders', () => {
    const counts = FilterAddon.calculateOffloadCounts(pkgs)
    expect(counts.offloadedByDir).toEqual({
      101: 3,
      102: 1,
    })
    expect(counts.offloadedBySubfolder).toEqual({
      '101:CNXN': 2,
      '101:OtherFolder': 1,
    })
  })

  it('builds FilterPanel offload items with nested level 2 items', () => {
    const counts = FilterAddon.calculateOffloadCounts(pkgs)
    const items = FilterAddon.buildOffloadFilterItems(auxDirs, counts)

    expect(items).toEqual([
      { value: 'offloaded:101', label: 'AddonPackages_Offload', count: 3, level: 1 },
      { value: 'offloaded:101:CNXN', label: 'CNXN', count: 2, level: 2 },
      { value: 'offloaded:101:OtherFolder', label: 'OtherFolder', count: 1, level: 2 },
      { value: 'offloaded:102', label: 'Directory Beta', count: 1, level: 1 },
    ])
  })

  it('sorts packages by offloaded directory label and subfolder correctly', () => {
    const sorted = [...pkgs].sort((a, b) => FilterAddon.compareByOffloadDirectory(a, b, auxDirs))
    expect(sorted.map((p) => p.filename)).toEqual(['A.var', 'B.var', 'C.var', 'D.var', 'E.var', 'F.var'])
  })

  it('supports dual filtering by storage state and offloaded directory location', () => {
    // When offloadedFilter is 'offloaded:101' and storage state is 'offloaded'
    let result = pkgs.filter(
      (p) => FilterAddon.matchesPackageFilter(p, 'offloaded') && FilterAddon.matchesPackageFilter(p, 'offloaded:101'),
    )
    expect(result).toEqual([pkgs[2], pkgs[3], pkgs[4]])

    // When offloadedFilter is 'all', all packages pass offloaded location check
    result = pkgs.filter(
      (p) => FilterAddon.matchesPackageFilter(p, 'all') && FilterAddon.matchesPackageFilter(p, 'all'),
    )
    expect(result).toHaveLength(6)
  })
})
// [AddOn] Filter_End
