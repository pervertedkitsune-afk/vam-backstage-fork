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
}
// [AddOn] Tabs_End
