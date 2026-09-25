// [AddOn] MissingSorting_Begin
/**
 * Modular AddOn class for Missing Dependencies Sorting operations.
 * Prefix debug logs with [MissingSorting].
 */
export class MissingSortingAddon {
  /**
   * Sort missing dependencies array based on column and direction.
   * @param {Array<object>} items - List of missing dep items.
   * @param {string|null} sortColumn - 'package' | 'author' | 'neededBy' | null
   * @param {'asc'|'desc'} sortDirection - 'asc' | 'desc'
   * @returns {Array<object>} Sorted array of items.
   */
  static sortMissingDeps(items, sortColumn, sortDirection = 'asc') {
    if (!items || !items.length) return items || []
    if (!sortColumn) return items

    console.log(`[MissingSorting] Sorting missing packages by '${sortColumn}' in '${sortDirection}' order`)

    const sorted = [...items]
    const dir = sortDirection === 'desc' ? -1 : 1

    sorted.sort((a, b) => {
      let res = 0
      if (sortColumn === 'package') {
        const nameA = String(a?.displayName || a?.ref || '').toLowerCase()
        const nameB = String(b?.displayName || b?.ref || '').toLowerCase()
        res = nameA.localeCompare(nameB)
      } else if (sortColumn === 'author') {
        const authorA = String(a?.creator || '').toLowerCase()
        const authorB = String(b?.creator || '').toLowerCase()
        res = authorA.localeCompare(authorB)
      } else if (sortColumn === 'neededBy') {
        const countA = Array.isArray(a?.neededBy) ? a.neededBy.length : 0
        const countB = Array.isArray(b?.neededBy) ? b.neededBy.length : 0
        res = countA - countB
        if (res === 0) {
          const nameA = String(a?.displayName || a?.ref || '').toLowerCase()
          const nameB = String(b?.displayName || b?.ref || '').toLowerCase()
          res = nameA.localeCompare(nameB)
        }
      }
      return res * dir
    })

    return sorted
  }
}
// [AddOn] MissingSorting_End
