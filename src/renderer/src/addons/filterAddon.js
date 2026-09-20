// [AddOn] Filter_Begin
/**
 * Modular AddOn class for Filter operations:
 * Handling offload directory subfolder extraction, counting, item building, filtering, and sorting.
 * Prefix logs with [Filter].
 */
export class FilterAddon {
  /**
   * Extract the 1st-level subfolder name from a package's subpath.
   * @param {object} pkg
   * @returns {string} Top-level subfolder name, or '' if root/empty.
   */
  static getFirstSubfolder(pkg) {
    if (!pkg || !pkg.subpath) return ''
    const norm = String(pkg.subpath).trim().replace(/\\/g, '/')
    if (!norm) return ''
    const parts = norm.split('/')
    return parts[0] || ''
  }

  /**
   * Calculate offload counts for directories and 1-level nested subfolders.
   * @param {Array<object>} items - List of package objects or content items.
   * @param {function} [getPkgFn] - Optional function to map item to package.
   * @returns {{ offloadedByDir: Record<string, number>, offloadedBySubfolder: Record<string, number> }}
   */
  static calculateOffloadCounts(items, getPkgFn) {
    const offloadedByDir = {}
    const offloadedBySubfolder = {}

    for (const item of items) {
      const pkg = getPkgFn ? getPkgFn(item) : item
      if (!pkg || pkg.storageState !== 'offloaded') continue

      if (pkg.libraryDirId != null) {
        const dirId = String(pkg.libraryDirId)
        offloadedByDir[dirId] = (offloadedByDir[dirId] || 0) + 1

        const subfolder = FilterAddon.getFirstSubfolder(pkg)
        if (subfolder) {
          const subKey = `${dirId}:${subfolder}`
          offloadedBySubfolder[subKey] = (offloadedBySubfolder[subKey] || 0) + 1
        }
      }
    }

    console.log('[Filter] Calculated offload counts:', { offloadedByDir, offloadedBySubfolder })
    return { offloadedByDir, offloadedBySubfolder }
  }

  /**
   * Check if a filter string is a valid offloaded filter value.
   * Supports `offloaded`, `offloaded:<dirId>`, and `offloaded:<dirId>:<subfolder>`.
   * @param {string} filterValue
   * @returns {boolean}
   */
  static isValidFilterValue(filterValue) {
    if (typeof filterValue !== 'string') return false
    if (['all', 'enabled', 'disabled', 'archived', 'offloaded'].includes(filterValue)) return true
    if (filterValue.startsWith('offloaded:')) return true
    return false
  }

  /**
   * Check if a package matches the offload / enabled filter value.
   * @param {object} pkg
   * @param {string} filterValue
   * @returns {boolean}
   */
  static matchesPackageFilter(pkg, filterValue) {
    if (!filterValue || filterValue === 'all') return true
    if (filterValue === 'enabled') return pkg?.storageState === 'enabled'
    if (filterValue === 'disabled') return pkg?.storageState === 'disabled'
    if (filterValue === 'archived') return pkg?.storageState === 'archived'
    if (filterValue === 'offloaded') return pkg?.storageState === 'offloaded'

    if (filterValue.startsWith('offloaded:')) {
      if (pkg?.storageState !== 'offloaded') return false
      const parts = filterValue.slice('offloaded:'.length).split(':')
      const dirId = parts[0]
      const subfolder = parts.length > 1 ? parts.slice(1).join(':') : null

      if (String(pkg.libraryDirId) !== String(dirId)) return false
      if (subfolder) {
        return FilterAddon.getFirstSubfolder(pkg) === subfolder
      }
      return true
    }

    return pkg?.storageState === filterValue
  }

  /**
   * Build FilterPanel items for offloaded directories and their 1-level nested subfolders.
   * @param {Array<object>} auxDirs - List of auxiliary library directories.
   * @param {object} counts - Counts from calculateOffloadCounts ({ offloadedByDir, offloadedBySubfolder }).
   * @returns {Array<object>} Filter items list with level properties.
   */
  static buildOffloadFilterItems(auxDirs = [], counts = {}) {
    const { offloadedByDir = {}, offloadedBySubfolder = {} } = counts
    const items = []

    const validAuxDirs = auxDirs.filter((d) => !d.archive)

    for (const dir of validAuxDirs) {
      const dirId = String(dir.id)
      const dirLabel = dir.label || (dir.path ? dir.path.split(/[/\\]/).pop() : `Offload ${dir.id}`)

      items.push({
        value: `offloaded:${dir.id}`,
        label: dirLabel,
        count: offloadedByDir[dirId] || 0,
        level: 1,
      })

      // Collect all subfolders for this directory
      const subfolders = new Set()
      const prefix = `${dirId}:`
      for (const key of Object.keys(offloadedBySubfolder)) {
        if (key.startsWith(prefix)) {
          const folderName = key.slice(prefix.length)
          if (folderName) subfolders.add(folderName)
        }
      }

      const sortedFolders = Array.from(subfolders).sort((a, b) => a.localeCompare(b))

      for (const folder of sortedFolders) {
        const subKey = `${dirId}:${folder}`
        items.push({
          value: `offloaded:${dir.id}:${folder}`,
          label: folder,
          count: offloadedBySubfolder[subKey] || 0,
          level: 2,
        })
      }
    }

    return items
  }

  /**
   * Sort comparator for sorting packages or content by offload directory and subfolder.
   * @param {object} a
   * @param {object} b
   * @param {Map<number, string>|Array<object>} auxDirs
   * @param {function} [getPkgFn]
   * @param {function} [getNameFn]
   * @returns {number}
   */
  static compareByOffloadDirectory(a, b, auxDirs, getPkgFn, getNameFn) {
    const pkgA = getPkgFn ? getPkgFn(a) : a
    const pkgB = getPkgFn ? getPkgFn(b) : b

    const auxDirMap =
      auxDirs instanceof Map
        ? auxDirs
        : new Map(
            (auxDirs || []).map((dir) => [
              dir.id,
              dir.label || (dir.path ? dir.path.split(/[/\\]/).pop() : `Directory ${dir.id}`),
            ]),
          )

    const dirNameA = pkgA?.libraryDirId != null ? auxDirMap.get(pkgA.libraryDirId) || '' : ''
    const dirNameB = pkgB?.libraryDirId != null ? auxDirMap.get(pkgB.libraryDirId) || '' : ''

    const dirCompare = dirNameA.localeCompare(dirNameB)
    if (dirCompare !== 0) return dirCompare

    const subA = FilterAddon.getFirstSubfolder(pkgA)
    const subB = FilterAddon.getFirstSubfolder(pkgB)
    const subCompare = subA.localeCompare(subB)
    if (subCompare !== 0) return subCompare

    const nameA = getNameFn ? getNameFn(a) : a?.filename || ''
    const nameB = getNameFn ? getNameFn(b) : b?.filename || ''
    return nameA.localeCompare(nameB)
  }
}
// [AddOn] Filter_End
