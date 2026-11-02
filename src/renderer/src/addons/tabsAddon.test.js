// [AddOn] Tabs_Begin
import { describe, it, expect } from 'vitest'
import { TabsAddon } from './tabsAddon'

describe('TabsAddon', () => {
  describe('sortLabelsByGroup', () => {
    it('returns empty array when given non-array or empty input', () => {
      expect(TabsAddon.sortLabelsByGroup(null)).toEqual([])
      expect(TabsAddon.sortLabelsByGroup(undefined)).toEqual([])
      expect(TabsAddon.sortLabelsByGroup([])).toEqual([])
    })

    it('places uncategorized labels on top and sorts them alphabetically by name', () => {
      const labels = [
        { id: 1, name: 'Zebra', category: null },
        { id: 2, name: 'Apple', category: '' },
        { id: 3, name: 'Mango', category: '   ' },
      ]

      const result = TabsAddon.sortLabelsByGroup(labels)
      expect(result.map((l) => l.name)).toEqual(['Apple', 'Mango', 'Zebra'])
    })

    it('groups categorized labels alphabetically by category, and sorts labels within each group alphabetically', () => {
      const labels = [
        { id: 1, name: 'Gravity', category: 'Clothing' },
        { id: 2, name: 'Fishnet', category: 'Clothing' },
        { id: 3, name: 'Lingerie', category: 'Clothing' },
        { id: 4, name: 'G', category: 'Breast Size' },
        { id: 5, name: 'Moon', category: 'Breast Size' },
        { id: 6, name: 'J', category: 'Breast Size' },
        { id: 7, name: 'Korean', category: 'Girls' },
        { id: 8, name: 'Game', category: 'Girls' },
      ]

      const result = TabsAddon.sortLabelsByGroup(labels)

      // Expected category order: Breast Size, Clothing, Girls
      // Breast Size: G, J, Moon
      // Clothing: Fishnet, Gravity, Lingerie
      // Girls: Game, Korean
      expect(result.map((l) => `${l.category}:${l.name}`)).toEqual([
        'Breast Size:G',
        'Breast Size:J',
        'Breast Size:Moon',
        'Clothing:Fishnet',
        'Clothing:Gravity',
        'Clothing:Lingerie',
        'Girls:Game',
        'Girls:Korean',
      ])
    })

    it('keeps uncategorized labels at the very top before categorized groups', () => {
      const labels = [
        { id: 1, name: 'Fishnet', category: 'Clothing' },
        { id: 2, name: 'Top No-Category Label', category: null },
        { id: 3, name: 'G', category: 'Breast Size' },
        { id: 4, name: 'Another Uncategorized', category: undefined },
        { id: 5, name: 'Game', category: 'Girls' },
      ]

      const result = TabsAddon.sortLabelsByGroup(labels)

      expect(result.map((l) => l.name)).toEqual([
        'Another Uncategorized',
        'Top No-Category Label',
        'G',
        'Fishnet',
        'Game',
      ])
    })

    it('handles case-insensitive sorting for both categories and label names', () => {
      const labels = [
        { id: 1, name: 'banana', category: 'fruit' },
        { id: 2, name: 'Apple', category: 'Fruit' },
        { id: 3, name: 'carrot', category: 'Vegetable' },
        { id: 4, name: 'asparagus', category: 'vegetable' },
        { id: 5, name: 'cherry', category: null },
      ]

      const result = TabsAddon.sortLabelsByGroup(labels)

      expect(result.map((l) => l.name)).toEqual(['cherry', 'Apple', 'banana', 'asparagus', 'carrot'])
    })

    it('filters out falsy items in labels array gracefully', () => {
      const labels = [
        null,
        { id: 1, name: 'Item B', category: 'Cat' },
        undefined,
        { id: 2, name: 'Item A', category: null },
      ]

      const result = TabsAddon.sortLabelsByGroup(labels)
      expect(result.map((l) => l.name)).toEqual(['Item A', 'Item B'])
    })
  })
})
// [AddOn] Tabs_End
