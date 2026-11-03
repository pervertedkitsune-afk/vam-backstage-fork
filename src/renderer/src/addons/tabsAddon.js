// [AddOn] Tabs_Begin
export class TabsAddon {
  /**
   * Sort labels grouped by category:
   * - Uncategorized labels (null, undefined, or empty/whitespace category) appear first at the top.
   * - Categories are grouped case-insensitively and sorted alphabetically.
   * - Within each category group, labels are sorted alphabetically by name (case-insensitive).
   * Returns a flat array of labels preserving visual layout without nesting/collapsing.
   *
   * @param {Array} labels
   * @returns {Array} Sorted labels array
   */
  static sortLabelsByGroup(labels) {
    if (!Array.isArray(labels)) return []

    const uncategorized = []
    // Map from normalized category key (lowercase) -> { displayCategory: string, items: Array }
    const categoryMap = new Map()

    for (const label of labels) {
      if (!label) continue
      const cat = (label.category || '').trim()
      if (!cat) {
        uncategorized.push(label)
      } else {
        const key = cat.toLowerCase()
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { displayCategory: cat, items: [] })
        }
        categoryMap.get(key).items.push(label)
      }
    }

    const sortByName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })

    uncategorized.sort(sortByName)

    const sortedGroups = Array.from(categoryMap.values()).sort((a, b) =>
      a.displayCategory.localeCompare(b.displayCategory, undefined, { sensitivity: 'base' }),
    )

    const result = [...uncategorized]
    for (const group of sortedGroups) {
      group.items.sort(sortByName)
      result.push(...group.items)
    }

    return result
  }

  /**
   * Fetch configured tooltip delay in milliseconds.
   * Defaults to 3000ms (3 seconds) if not configured or invalid.
   * @returns {Promise<number>}
   */
  /**
   * Sort labels by priority (descending: larger numbers first),
   * breaking ties alphabetically by name in ascending order (A-Z).
   * @param {Array} labels
   * @returns {Array}
   */
  static sortLabelsByPriorityAscName(labels) {
    if (!Array.isArray(labels)) return []
    return [...labels].sort((a, b) => {
      const pDiff = (b?.priority || 0) - (a?.priority || 0)
      if (pDiff !== 0) return pDiff
      return (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
    })
  }

  /**
   * Filter and rank labels by search query with priority first, then alphabetical:
   * Matches where name or category includes query are sorted with larger priority
   * numbers first, breaking ties alphabetically by name.
   * @param {Array} labels
   * @param {string} query
   * @returns {Array}
   */
  static filterAndSortLabelsBySearch(labels, query) {
    if (!Array.isArray(labels)) return []
    const q = (query || '').trim().toLowerCase()
    if (!q) return TabsAddon.sortLabelsByPriorityAscName(labels)

    const matches = []
    for (const l of labels) {
      if (!l) continue
      const lowerName = (l.name || '').toLowerCase()
      const lowerCat = (l.category || '').toLowerCase()
      if (lowerName.includes(q) || lowerCat.includes(q)) {
        matches.push(l)
      }
    }
    return TabsAddon.sortLabelsByPriorityAscName(matches)
  }

  static async getTooltipDelayMs() {
    try {
      const val = await window.api?.settings?.get('tag_tooltip_delay')
      const parsed = parseInt(val, 10)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed
      }
    } catch {
      // Fallback to default
    }
    return 3000
  }
}
// [AddOn] Tabs_End
