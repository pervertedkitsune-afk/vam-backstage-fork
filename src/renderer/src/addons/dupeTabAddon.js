// [AddOn] DupeTab_Begin
export const DUPE_TAB_COLUMNS = [
  { id: 'packageName', label: 'Package Name', defaultVisible: true },
  { id: 'sizeBytes', label: 'File Size', defaultVisible: true },
  { id: 'fileDate', label: 'Date', defaultVisible: true },
  { id: 'creator', label: 'Creator', defaultVisible: true },
  { id: 'version', label: 'Version', defaultVisible: true },
  { id: 'folder', label: 'Folder / Location', defaultVisible: true },
  { id: 'storageState', label: 'State', defaultVisible: true },
]

export class DupeTabRendererAddon {
  /**
   * Sort duplicate groups by a specified column and direction.
   *
   * @param {Array<object>} groups
   * @param {string} sortBy
   * @param {'asc'|'desc'} sortDirection
   * @returns {Array<object>}
   */
  static sortGroups(groups, sortBy = 'packageName', sortDirection = 'asc') {
    if (!Array.isArray(groups)) return []
    const sorted = [...groups]
    const dir = sortDirection === 'desc' ? -1 : 1

    sorted.sort((a, b) => {
      let valA
      let valB
      switch (sortBy) {
        case 'sizeBytes':
          valA = a.sizeBytes || 0
          valB = b.sizeBytes || 0
          return (valA - valB) * dir
        case 'creator':
          valA = (a.creator || '').toLowerCase()
          valB = (b.creator || '').toLowerCase()
          return valA.localeCompare(valB) * dir
        case 'version':
          valA = parseInt(a.version, 10) || 0
          valB = parseInt(b.version, 10) || 0
          return (valA - valB) * dir
        case 'count':
          valA = a.count || 0
          valB = b.count || 0
          return (valA - valB) * dir
        case 'packageName':
        default:
          valA = (a.packageName || '').toLowerCase()
          valB = (b.packageName || '').toLowerCase()
          return valA.localeCompare(valB) * dir
      }
    })
    return sorted
  }

  /**
   * Filter groups by search query.
   *
   * @param {Array<object>} groups
   * @param {string} search
   * @returns {Array<object>}
   */
  static filterGroups(groups, search) {
    if (!Array.isArray(groups)) return []
    const q = (search || '').trim().toLowerCase()
    if (!q) return groups

    return groups.filter((g) => {
      const matchGroup =
        (g.packageName && g.packageName.toLowerCase().includes(q)) || (g.creator && g.creator.toLowerCase().includes(q))
      if (matchGroup) return true
      return g.items?.some(
        (it) =>
          (it.filename && it.filename.toLowerCase().includes(q)) ||
          (it.file_path && it.file_path.toLowerCase().includes(q)) ||
          (it.subpath && it.subpath.toLowerCase().includes(q)),
      )
    })
  }

  /**
   * Move an element in an array from one index to another.
   *
   * @param {Array} list
   * @param {number} fromIndex
   * @param {number} toIndex
   * @returns {Array}
   */
  static reorderList(list, fromIndex, toIndex) {
    if (!Array.isArray(list)) return []
    const result = Array.from(list)
    const [removed] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, removed)
    return result
  }
}
// [AddOn] DupeTab_End
