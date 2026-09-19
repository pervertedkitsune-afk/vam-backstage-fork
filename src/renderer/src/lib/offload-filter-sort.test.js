// [AddOn] Filter - Begin
import { describe, it, expect } from 'vitest'

function filterPackagesByEnabledStorage(items, enabledFilter) {
  if (enabledFilter === 'all') return items
  if (enabledFilter.startsWith('offloaded:')) {
    const dirId = enabledFilter.slice('offloaded:'.length)
    return items.filter((p) => p.storageState === 'offloaded' && String(p.libraryDirId) === String(dirId))
  }
  return items.filter((p) => p.storageState === enabledFilter)
}

function matchesContentPackageStatus(c, packageStatusFilter, isContentArchived, isPackageDisabled) {
  if (packageStatusFilter === 'all') return true
  const archived = isContentArchived(c)
  if (packageStatusFilter === 'archived') return archived
  if (archived) return false

  const pkg = c.sourcePackage ?? c.package
  if (packageStatusFilter === 'offloaded') {
    return pkg?.storageState === 'offloaded'
  }
  if (packageStatusFilter.startsWith('offloaded:')) {
    const dirId = packageStatusFilter.slice('offloaded:'.length)
    return pkg?.storageState === 'offloaded' && String(pkg?.libraryDirId) === String(dirId)
  }

  const disabled = isPackageDisabled(c)
  if (packageStatusFilter === 'disabled') return disabled
  return !disabled
}

describe('Offload Directory Filtering and Sorting', () => {
  const pkgs = [
    { filename: 'A.var', storageState: 'enabled', libraryDirId: null },
    { filename: 'B.var', storageState: 'disabled', libraryDirId: null },
    { filename: 'C.var', storageState: 'offloaded', libraryDirId: 101 },
    { filename: 'D.var', storageState: 'offloaded', libraryDirId: 102 },
  ]

  const auxDirMap = new Map([
    [101, 'Directory Alpha'],
    [102, 'Directory Beta'],
  ])

  it('filters packages by general storage state and specific offloaded directory ID', () => {
    expect(filterPackagesByEnabledStorage(pkgs, 'all')).toHaveLength(4)
    expect(filterPackagesByEnabledStorage(pkgs, 'enabled')).toEqual([pkgs[0]])
    expect(filterPackagesByEnabledStorage(pkgs, 'disabled')).toEqual([pkgs[1]])
    expect(filterPackagesByEnabledStorage(pkgs, 'offloaded')).toEqual([pkgs[2], pkgs[3]])
    expect(filterPackagesByEnabledStorage(pkgs, 'offloaded:101')).toEqual([pkgs[2]])
    expect(filterPackagesByEnabledStorage(pkgs, 'offloaded:102')).toEqual([pkgs[3]])
  })

  it('sorts packages by offloaded directory label correctly', () => {
    const sortFn = (a, b) => {
      const nameA = a.libraryDirId != null ? auxDirMap.get(a.libraryDirId) || '' : ''
      const nameB = b.libraryDirId != null ? auxDirMap.get(b.libraryDirId) || '' : ''
      return nameA.localeCompare(nameB) || a.filename.localeCompare(b.filename)
    }

    const sorted = [...pkgs].sort(sortFn)
    expect(sorted.map((p) => p.filename)).toEqual(['A.var', 'B.var', 'C.var', 'D.var'])
  })

  it('filters content items by offloaded directory ID', () => {
    const contentItems = [
      { id: '1', package: pkgs[0] },
      { id: '2', package: pkgs[2] },
      { id: '3', package: pkgs[3] },
    ]

    const isArchived = () => false
    const isDisabled = (c) => c.package.storageState === 'disabled'

    expect(contentItems.filter((c) => matchesContentPackageStatus(c, 'all', isArchived, isDisabled))).toHaveLength(3)
    expect(
      contentItems.filter((c) => matchesContentPackageStatus(c, 'offloaded', isArchived, isDisabled)),
    ).toHaveLength(2)
    expect(contentItems.filter((c) => matchesContentPackageStatus(c, 'offloaded:101', isArchived, isDisabled))).toEqual(
      [contentItems[1]],
    )
    expect(contentItems.filter((c) => matchesContentPackageStatus(c, 'offloaded:102', isArchived, isDisabled))).toEqual(
      [contentItems[2]],
    )
  })
})
// [AddOn] Filter - End
