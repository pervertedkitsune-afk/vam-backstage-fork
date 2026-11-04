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

    it('orders categories by category priority descending (larger numbers first), keeping uncategorized on top', () => {
      const labels = [
        { id: 1, name: 'Fishnet', category: 'Clothing' },
        { id: 2, name: 'Moon', category: 'Breast Size' },
        { id: 3, name: 'Game', category: 'Girls' },
        { id: 4, name: 'Uncategorized 1', category: null },
      ]

      const priorities = {
        girls: 100,
        clothing: 50,
        'breast size': 10,
      }

      const result = TabsAddon.sortLabelsByGroup(labels, priorities)

      expect(result.map((l) => l.name)).toEqual(['Uncategorized 1', 'Game', 'Fishnet', 'Moon'])
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

  describe('sortLabelsByPriorityAscName & filterAndSortLabelsBySearch', () => {
    it('sorts labels by priority descending (larger first), then name ascending', () => {
      const labels = [
        { id: 1, name: 'Zeta', priority: 10 },
        { id: 2, name: 'Alpha', priority: 10 },
        { id: 3, name: 'Delta', priority: 50 },
        { id: 4, name: 'Beta', priority: 0 },
        { id: 5, name: 'Apple', priority: 0 },
      ]

      const sorted = TabsAddon.sortLabelsByPriorityAscName(labels)
      expect(sorted.map((l) => `${l.priority}:${l.name}`)).toEqual([
        '50:Delta',
        '10:Alpha',
        '10:Zeta',
        '0:Apple',
        '0:Beta',
      ])
    })

    it('filters by query and sorts results with larger priority first', () => {
      const labels = [
        { id: 1, name: 'Female Character', category: 'Actors', priority: 5 },
        { id: 2, name: 'Male Character', category: 'Actors', priority: 20 },
        { id: 3, name: 'Unrelated', category: 'Props', priority: 100 },
        { id: 4, name: 'Character Anime', category: 'Anime', priority: 20 },
      ]

      const filtered = TabsAddon.filterAndSortLabelsBySearch(labels, 'character')
      expect(filtered.map((l) => `${l.priority}:${l.name}`)).toEqual([
        '20:Character Anime',
        '20:Male Character',
        '5:Female Character',
      ])
    })
  })

  describe('category priorities storage', () => {
    it('gets and sets category priorities correctly', async () => {
      let stored = null
      const origWindow = global.window
      try {
        global.window = {
          api: {
            settings: {
              get: async () => stored,
              set: async (key, val) => {
                stored = val
              },
            },
          },
        }

        expect(await TabsAddon.getCategoryPriorities()).toEqual({})
        await TabsAddon.setCategoryPriorities({ clothing: 50 })
        expect(await TabsAddon.getCategoryPriorities()).toEqual({ clothing: 50 })
      } finally {
        global.window = origWindow
      }
    })
  })

  describe('getTooltipDelayMs', () => {
    it('defaults to 3000 when window.api is undefined or setting missing', async () => {
      const origWindow = global.window
      try {
        global.window = {}
        const delay = await TabsAddon.getTooltipDelayMs()
        expect(delay).toBe(3000)
      } finally {
        global.window = origWindow
      }
    })

    it('returns parsed integer when setting is configured', async () => {
      const origWindow = global.window
      try {
        global.window = {
          api: {
            settings: {
              get: async (key) => (key === 'tag_tooltip_delay' ? '2000' : null),
            },
          },
        }
        const delay = await TabsAddon.getTooltipDelayMs()
        expect(delay).toBe(2000)
      } finally {
        global.window = origWindow
      }
    })
  })
})
// [AddOn] Tabs_End
