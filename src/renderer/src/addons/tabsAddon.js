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
