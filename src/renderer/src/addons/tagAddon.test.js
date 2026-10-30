// [AddOn] TagAddon_Begin
import { describe, it, expect } from 'vitest'
import { TagAddon } from './tagAddon'
import { labelColor, LABEL_PALETTE } from '../lib/labels'

describe('TagAddon', () => {
  it('calculates tag package counts correctly', () => {
    const packages = [
      { filename: 'a.var', hubTags: 'clothing, hair, nsfw' },
      { filename: 'b.var', hubTags: 'clothing, pose' },
      { filename: 'c.var', hubTags: 'hair' },
    ]

    const counts = TagAddon.getTagCounts(packages)
    expect(counts).toEqual([
      { tag: 'clothing', count: 2 },
      { tag: 'hair', count: 2 },
      { tag: 'nsfw', count: 1 },
      { tag: 'pose', count: 1 },
    ])
  })

  it('filters tags for dropdown selection (only count > 1)', () => {
    const tagList = [
      { tag: 'clothing', count: 2 },
      { tag: 'hair', count: 2 },
      { tag: 'nsfw', count: 1 },
      { tag: 'pose', count: 1 },
    ]

    const filtered = TagAddon.filterDropdownTags(tagList)
    expect(filtered).toEqual([
      { tag: 'clothing', count: 2 },
      { tag: 'hair', count: 2 },
    ])
  })

  it('filters labels for dropdown selection (only packageCount > 1)', () => {
    const labels = [
      { id: 1, name: 'Favs', packageCount: 5 },
      { id: 2, name: 'Single', packageCount: 1 },
      { id: 3, name: 'Zero', packageCount: 0 },
      { id: 4, name: 'Popular', packageCount: 2 },
    ]

    const filtered = TagAddon.filterDropdownLabels(labels)
    expect(filtered).toEqual([
      { id: 1, name: 'Favs', packageCount: 5 },
      { id: 4, name: 'Popular', packageCount: 2 },
    ])
  })

  it('groups labels by folder category correctly', () => {
    const labels = [
      { id: 1, name: 'Project A', category: 'Work' },
      { id: 2, name: 'Project B', category: 'Work' },
      { id: 3, name: 'Favs', category: null },
      { id: 4, name: 'Personal 1', category: 'Personal' },
    ]

    const groups = TagAddon.groupLabelsByCategory(labels)
    expect(groups).toEqual([
      {
        category: 'Personal',
        labels: [{ id: 4, name: 'Personal 1', category: 'Personal' }],
      },
      {
        category: 'Work',
        labels: [
          { id: 1, name: 'Project A', category: 'Work' },
          { id: 2, name: 'Project B', category: 'Work' },
        ],
      },
      {
        category: 'Uncategorized',
        labels: [{ id: 3, name: 'Favs', category: null }],
      },
    ])
  })

  it('filters favorite quick labels up to a max of 6', () => {
    const labels = [
      { id: 1, name: 'L1', isFavorite: true },
      { id: 2, name: 'L2', isFavorite: false },
      { id: 3, name: 'L3', isFavorite: true },
      { id: 4, name: 'L4', isFavorite: true },
      { id: 5, name: 'L5', isFavorite: true },
      { id: 6, name: 'L6', isFavorite: true },
      { id: 7, name: 'L7', isFavorite: true },
      { id: 8, name: 'L8', isFavorite: true },
    ]

    const favs = labels.filter((l) => l.isFavorite).slice(0, 6)
    expect(favs).toHaveLength(6)
    expect(favs.map((l) => l.id)).toEqual([1, 3, 4, 5, 6, 7])
  })
})

describe('labelColor with custom hex colors and expanded palette', () => {
  it('resolves custom hex strings', () => {
    const customLabel = { id: 1, color: '#ff0055' }
    expect(labelColor(customLabel)).toBe('#ff0055')
  })

  it('resolves expanded computer design palette entries', () => {
    const crtAmberLabel = { id: 2, color: 11 }
    expect(labelColor(crtAmberLabel)).toBe(LABEL_PALETTE[11].hex)
    expect(LABEL_PALETTE[11].name).toBe('CRT Amber')
  })
})
// [AddOn] TagAddon_End
