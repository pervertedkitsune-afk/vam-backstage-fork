// [AddOn] FolderFilter_Begin
/**
 * Modular AddOn class for Folder / Location Filter operations.
 * Handles building Location section items, counting packages/content by location,
 * and matching packages against location filters.
 * Prefix debug logs with [FolderFilter].
 */
export class FolderFilterAddon {
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
   * Calculate location counts for "All", "Offloaded", each offload directory, and subfolders.
   * @param {Array<object>} filteredItems - List of package objects or content items after filtering.
   * @param {Array<object>} [allItems] - Full list of package objects or content items before filtering (to discover all subfolders).
   * @param {function} [getPkgFn] - Optional function to map item to package.
   * @returns {{ all: number, offloaded: number, offloadedByDir: Record<string, number>, offloadedBySubfolder: Record<string, number>, knownSubfoldersByDir: Record<string, Set<string>> }}
   */
  static calculateLocationCounts(filteredItems = [], allItems = [], getPkgFn) {
    let all = 0
    let offloaded = 0
    const offloadedByDir = {}
    const offloadedBySubfolder = {}
    const knownSubfoldersByDir = {}

    // Collect all known subfolders from allItems (or filteredItems if allItems not provided)
    const discoverySource = allItems && allItems.length > 0 ? allItems : filteredItems
    for (const item of discoverySource) {
      const pkg = getPkgFn ? getPkgFn(item) : item
      if (pkg && pkg.libraryDirId != null) {
        const dirId = String(pkg.libraryDirId)
        if (!knownSubfoldersByDir[dirId]) knownSubfoldersByDir[dirId] = new Set()
        const subfolder = FolderFilterAddon.getFirstSubfolder(pkg)
        if (subfolder) {
          knownSubfoldersByDir[dirId].add(subfolder)
        }
      }
    }

    for (const item of filteredItems) {
      all++
      const pkg = getPkgFn ? getPkgFn(item) : item

      if (pkg && (pkg.storageState === 'offloaded' || pkg.libraryDirId != null)) {
        offloaded++
        if (pkg.libraryDirId != null) {
          const dirId = String(pkg.libraryDirId)
          offloadedByDir[dirId] = (offloadedByDir[dirId] || 0) + 1

          const subfolder = FolderFilterAddon.getFirstSubfolder(pkg)
          if (subfolder) {
            const subKey = `${dirId}:${subfolder}`
            offloadedBySubfolder[subKey] = (offloadedBySubfolder[subKey] || 0) + 1
          }
        }
      }
    }

    console.log('[FolderFilter] Calculated location counts:', {
      all,
      offloaded,
      offloadedByDir,
      offloadedBySubfolder,
      knownSubfoldersByDir,
    })
    return { all, offloaded, offloadedByDir, offloadedBySubfolder, knownSubfoldersByDir }
  }

  /**
   * Check if a filter string is a valid location filter value.
   * Supports `all`, `offloaded`, `offloaded:<dirId>`, and `offloaded:<dirId>:<subfolder>`.
   * @param {string} filterValue
   * @returns {boolean}
   */
  static isValidLocationFilter(filterValue) {
    if (typeof filterValue !== 'string') return false
    if (['all', 'offloaded'].includes(filterValue)) return true
    if (filterValue.startsWith('offloaded:')) return true
    return false
  }

  /**
   * Check if a package matches the location filter value.
   * @param {object} pkg
   * @param {string} filterValue
   * @returns {boolean}
   */
  static matchesLocationFilter(pkg, filterValue) {
    if (!filterValue || filterValue === 'all') return true

    if (filterValue === 'offloaded') {
      return pkg?.storageState === 'offloaded' || pkg?.libraryDirId != null
    }

    if (filterValue.startsWith('offloaded:')) {
      if (pkg?.libraryDirId == null) return false
      const parts = filterValue.slice('offloaded:'.length).split(':')
      const dirId = parts[0]
      const subfolder = parts.length > 1 ? parts.slice(1).join(':') : null

      if (String(pkg.libraryDirId) !== String(dirId)) return false
      if (subfolder) {
        return FolderFilterAddon.getFirstSubfolder(pkg) === subfolder
      }
      return true
    }

    return true
  }

  /**
   * Build Location FilterPanel section items for "All", "Offloaded", offloaded directories, and nested subfolders.
   * @param {Array<object>} auxDirs - List of auxiliary library directories.
   * @param {object} counts - Counts from calculateLocationCounts.
   * @returns {Array<object>} Filter items list with level properties.
   */
  static buildLocationFilterItems(auxDirs = [], counts = {}) {
    const { all = 0, offloaded = 0, offloadedByDir = {}, offloadedBySubfolder = {}, knownSubfoldersByDir = {} } = counts

    const items = [
      { value: 'all', label: 'All', count: all },
      { value: 'offloaded', label: 'Offloaded', count: offloaded },
    ]

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

      // Collect subfolders for this directory
      const subfolders = new Set(knownSubfoldersByDir[dirId] || [])
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

    console.log('[FolderFilter] Built location filter items:', items)
    return items
  }
}
// [AddOn] FolderFilter_End
