// [AddOn] FolderFilter_Begin
/**
 * Modular AddOn class for Folder / Location Filter operations.
 * Handles building Location section items, counting packages/content by location,
 * and matching packages against location filters using current or original offload directory.
 * Prefix debug logs with [FolderFilter].
 */
export class FolderFilterAddon {
  /**
   * Extract normalized subpath parts (directories) from a package's subpath.
   * @param {object} pkg
   * @returns {string[]} Directory parts, e.g. ['Folder1', 'SubFolder2']
   */
  static getSubpathParts(pkg) {
    if (!pkg || !pkg.subpath) return []
    const norm = String(pkg.subpath).trim().replace(/\\/g, '/')
    if (!norm) return []
    return norm.split('/').filter(Boolean)
  }

  /**
   * Extract the 1st-level subfolder name from a package's subpath.
   * @param {object} pkg
   * @returns {string} Top-level subfolder name, or '' if root/empty.
   */
  static getFirstSubfolder(pkg) {
    const parts = FolderFilterAddon.getSubpathParts(pkg)
    return parts[0] || ''
  }

  /**
   * Extract the 2nd-level subfolder path (Folder1/SubFolder2) from a package's subpath.
   * @param {object} pkg
   * @returns {string} 2nd-level subfolder path, or '' if depth < 2.
   */
  static getSecondSubfolder(pkg) {
    const parts = FolderFilterAddon.getSubpathParts(pkg)
    if (parts.length < 2) return ''
    return `${parts[0]}/${parts[1]}`
  }

  /**
   * Get the effective library directory ID for a package (current libraryDirId or originating originalLibraryDirId).
   * @param {object} pkg
   * @returns {number|string|null}
   */
  static getEffectiveLibraryDirId(pkg) {
    if (!pkg) return null
    if (pkg.libraryDirId != null) return pkg.libraryDirId
    if (pkg.originalLibraryDirId != null) return pkg.originalLibraryDirId
    return null
  }

  /**
   * Calculate location counts for "All", "Offloaded", each offload directory, and nested subfolders (up to depth 2).
   * Uses originalLibraryDirId when libraryDirId is null (e.g. enabled packages originating from offload dirs).
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
      const effDirId = FolderFilterAddon.getEffectiveLibraryDirId(pkg)
      if (effDirId != null) {
        const dirId = String(effDirId)
        if (!knownSubfoldersByDir[dirId]) knownSubfoldersByDir[dirId] = new Set()
        const parts = FolderFilterAddon.getSubpathParts(pkg)
        if (parts.length >= 1) {
          knownSubfoldersByDir[dirId].add(parts[0])
        }
        if (parts.length >= 2) {
          knownSubfoldersByDir[dirId].add(`${parts[0]}/${parts[1]}`)
        }
      }
    }

    for (const item of filteredItems) {
      all++
      const pkg = getPkgFn ? getPkgFn(item) : item
      const effDirId = FolderFilterAddon.getEffectiveLibraryDirId(pkg)

      if (pkg && (pkg.storageState === 'offloaded' || effDirId != null)) {
        offloaded++
      }

      if (effDirId != null) {
        const dirId = String(effDirId)
        offloadedByDir[dirId] = (offloadedByDir[dirId] || 0) + 1

        const parts = FolderFilterAddon.getSubpathParts(pkg)
        if (parts.length >= 1) {
          const subKey1 = `${dirId}:${parts[0]}`
          offloadedBySubfolder[subKey1] = (offloadedBySubfolder[subKey1] || 0) + 1
        }
        if (parts.length >= 2) {
          const subKey2 = `${dirId}:${parts[0]}/${parts[1]}`
          offloadedBySubfolder[subKey2] = (offloadedBySubfolder[subKey2] || 0) + 1
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
   * Check if a package matches the location filter value based on current or originating directory.
   * @param {object} pkg
   * @param {string} filterValue
   * @returns {boolean}
   */
  static matchesLocationFilter(pkg, filterValue) {
    if (!filterValue || filterValue === 'all') return true

    if (filterValue === 'offloaded') {
      return pkg?.storageState === 'offloaded' || FolderFilterAddon.getEffectiveLibraryDirId(pkg) != null
    }

    if (filterValue.startsWith('offloaded:')) {
      const effDirId = FolderFilterAddon.getEffectiveLibraryDirId(pkg)
      if (effDirId == null) return false

      const parts = filterValue.slice('offloaded:'.length).split(':')
      const dirId = parts[0]
      const subfolder = parts.length > 1 ? parts.slice(1).join(':') : null

      if (String(effDirId) !== String(dirId)) return false
      if (subfolder) {
        const subpathParts = FolderFilterAddon.getSubpathParts(pkg)
        const subfolderParts = subfolder.split('/').filter(Boolean)
        if (subfolderParts.length === 1) {
          return subpathParts[0] === subfolderParts[0]
        } else if (subfolderParts.length >= 2) {
          return subpathParts[0] === subfolderParts[0] && subpathParts[1] === subfolderParts[1]
        }
      }
      return true
    }

    return true
  }

  /**
   * Build Location FilterPanel section items for "All", "Offloaded", offloaded directories, and nested subfolders (depth 1 & 2).
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

      // Separate into depth 1 (e.g. "Folder1") and depth 2 (e.g. "Folder1/SubFolder2")
      const depth1Folders = new Set()
      const depth2Map = new Map() // parentFolder1 -> Set of depth2 folder paths ("Folder1/SubFolder2")

      for (const folderPath of subfolders) {
        const parts = folderPath.split('/').filter(Boolean)
        if (parts.length >= 1) {
          const parent = parts[0]
          depth1Folders.add(parent)
          if (parts.length >= 2) {
            if (!depth2Map.has(parent)) depth2Map.set(parent, new Set())
            depth2Map.get(parent).add(`${parts[0]}/${parts[1]}`)
          }
        }
      }

      const sortedDepth1 = Array.from(depth1Folders).sort((a, b) => a.localeCompare(b))

      for (const f1 of sortedDepth1) {
        const subKey1 = `${dirId}:${f1}`
        items.push({
          value: `offloaded:${dir.id}:${f1}`,
          label: f1,
          count: offloadedBySubfolder[subKey1] || 0,
          level: 2,
        })

        const d2Set = depth2Map.get(f1)
        if (d2Set && d2Set.size > 0) {
          const sortedDepth2 = Array.from(d2Set).sort((a, b) => a.localeCompare(b))
          for (const f2Path of sortedDepth2) {
            const subKey2 = `${dirId}:${f2Path}`
            const f2Name = f2Path.split('/').pop()
            items.push({
              value: `offloaded:${dir.id}:${f2Path}`,
              label: f2Name,
              count: offloadedBySubfolder[subKey2] || 0,
              level: 3,
            })
          }
        }
      }
    }

    console.log('[FolderFilter] Built location filter items:', items)
    return items
  }
}
// [AddOn] FolderFilter_End
