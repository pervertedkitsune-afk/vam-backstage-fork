// [AddOn] TagAddon_Begin
import { parseCommaTags } from '@/lib/suggestion-counts'

export class TagAddon {
  /**
   * Calculate tag package counts across packages.
   * @param {Array} packages
   * @returns {Array<{ tag: string, count: number }>} Sorted by count desc, then name asc
   */
  static getTagCounts(packages) {
    if (!Array.isArray(packages)) return []
    const counts = {}
    for (const pkg of packages) {
      if (!pkg) continue
      const tags = parseCommaTags(pkg.hubTags)
      for (const t of tags) {
        counts[t] = (counts[t] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }

  /**
   * Filter tags for dropdown selection: only items with > 1 package.
   * @param {Array<{ tag: string, count: number }>} tagList
   * @returns {Array<{ tag: string, count: number }>}
   */
  static filterDropdownTags(tagList) {
    if (!Array.isArray(tagList)) return []
    return tagList.filter((item) => item.count > 1)
  }

  /**
   * Filter labels for dropdown selection: only items with > 1 package application.
   * @param {Array} labels
   * @returns {Array}
   */
  static filterDropdownLabels(labels) {
    if (!Array.isArray(labels)) return []
    return labels.filter((label) => (label.packageCount || 0) > 1)
  }

  /**
   * Sort labels by priority (descending), breaking ties by name in descending order.
   * @param {Array} labels
   * @returns {Array}
   */
  static sortLabelsByPriority(labels) {
    if (!Array.isArray(labels)) return []
    return [...labels].sort((a, b) => {
      const pDiff = (b.priority || 0) - (a.priority || 0)
      if (pDiff !== 0) return pDiff
      return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' })
    })
  }

  /**
   * Group labels by their folder category property.
   * @param {Array} labels
   * @returns {Array<{ category: string, labels: Array }>}
   */
  static groupLabelsByCategory(labels) {
    if (!Array.isArray(labels)) return []
    const groups = new Map()

    for (const label of labels) {
      if (!label) continue
      const cat = (label.category || '').trim() || 'Uncategorized'
      if (!groups.has(cat)) {
        groups.set(cat, [])
      }
      groups.get(cat).push(label)
    }

    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        labels: TagAddon.sortLabelsByPriority(items),
      }))
      .sort((a, b) => {
        if (a.category === 'Uncategorized') return 1
        if (b.category === 'Uncategorized') return -1
        return a.category.localeCompare(b.category, undefined, { sensitivity: 'base' })
      })
  }
}
// [AddOn] TagAddon_End
