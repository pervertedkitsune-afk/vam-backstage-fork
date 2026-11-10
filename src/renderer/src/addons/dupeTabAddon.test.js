// [AddOn] DupeTab_Begin
import { describe, it, expect } from 'vitest'
import { DupeTabRendererAddon, DUPE_TAB_COLUMNS } from './dupeTabAddon.js'

describe('DupeTabRendererAddon', () => {
  it('has expected default columns', () => {
    expect(DUPE_TAB_COLUMNS.length).toBeGreaterThan(0)
    expect(DUPE_TAB_COLUMNS.map((c) => c.id)).toContain('packageName')
    expect(DUPE_TAB_COLUMNS.map((c) => c.id)).toContain('folder')
  })

  it('reorders columns correctly', () => {
    const original = ['colA', 'colB', 'colC']
    const reordered = DupeTabRendererAddon.reorderList(original, 0, 2)
    expect(reordered).toEqual(['colB', 'colC', 'colA'])
  })

  it('sorts groups by size and package name', () => {
    const groups = [
      { packageName: 'Beta', sizeBytes: 500 },
      { packageName: 'Alpha', sizeBytes: 1500 },
      { packageName: 'Gamma', sizeBytes: 200 },
    ]

    const sortedByName = DupeTabRendererAddon.sortGroups(groups, 'packageName', 'asc')
    expect(sortedByName.map((g) => g.packageName)).toEqual(['Alpha', 'Beta', 'Gamma'])

    const sortedBySizeDesc = DupeTabRendererAddon.sortGroups(groups, 'sizeBytes', 'desc')
    expect(sortedBySizeDesc.map((g) => g.sizeBytes)).toEqual([1500, 500, 200])
  })

  it('filters groups based on search text', () => {
    const groups = [
      {
        packageName: 'CreatorA.Item',
        creator: 'CreatorA',
        items: [{ filename: 'CreatorA.Item.1.var', file_path: '/path/Item.var' }],
      },
      {
        packageName: 'CreatorB.Look',
        creator: 'CreatorB',
        items: [{ filename: 'CreatorB.Look.1.var', file_path: '/path/Look.var' }],
      },
    ]

    const filtered = DupeTabRendererAddon.filterGroups(groups, 'look')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].packageName).toBe('CreatorB.Look')
  })
})
// [AddOn] DupeTab_End
