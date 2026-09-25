// [AddOn] MissingSorting_Begin
import { describe, it, expect } from 'vitest'
import { MissingSortingAddon } from './missingSortingAddon'

describe('MissingSortingAddon', () => {
  const sampleDeps = [
    {
      ref: 'B_Package',
      displayName: 'RG_Morph_Fix',
      creator: 'SkaredSic',
      neededBy: [{ name: 'Black_dress' }],
    },
    {
      ref: 'A_Package',
      displayName: 'Eros_Fashion',
      creator: 'Eros',
      neededBy: [{ name: 'fashion_show' }, { name: 'another_show' }],
    },
    {
      ref: 'C_Package',
      displayName: 'TIFA3_0',
      creator: 'Eros',
      neededBy: [{ name: 'wedding' }],
    },
  ]

  it('returns items unmodified when sortColumn is null', () => {
    const result = MissingSortingAddon.sortMissingDeps(sampleDeps, null)
    expect(result).toEqual(sampleDeps)
  })

  it('sorts by Package display name in asc and desc order', () => {
    const asc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'package', 'asc')
    expect(asc.map((d) => d.displayName)).toEqual(['Eros_Fashion', 'RG_Morph_Fix', 'TIFA3_0'])

    const desc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'package', 'desc')
    expect(desc.map((d) => d.displayName)).toEqual(['TIFA3_0', 'RG_Morph_Fix', 'Eros_Fashion'])
  })

  it('sorts by Author in asc and desc order', () => {
    const asc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'author', 'asc')
    expect(asc.map((d) => d.creator)).toEqual(['Eros', 'Eros', 'SkaredSic'])

    const desc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'author', 'desc')
    expect(desc.map((d) => d.creator)).toEqual(['SkaredSic', 'Eros', 'Eros'])
  })

  it('sorts by Needed by count in asc and desc order', () => {
    const asc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'neededBy', 'asc')
    expect(asc.map((d) => d.neededBy.length)).toEqual([1, 1, 2])

    const desc = MissingSortingAddon.sortMissingDeps(sampleDeps, 'neededBy', 'desc')
    expect(desc.map((d) => d.neededBy.length)).toEqual([2, 1, 1])
  })
})
// [AddOn] MissingSorting_End
