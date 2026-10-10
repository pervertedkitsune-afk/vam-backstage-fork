// [AddOn] FolderFilter_Begin
import { useSyncExternalStore } from 'react'

const folderCollapsedListeners = new Set()
const memoryStore = new Map()

function getStorageItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // fallback to memoryStore
  }
  return memoryStore.get(key) ?? null
}

function setStorageItem(key, val) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val)
    }
  } catch {
    // fallback to memoryStore
  }
  memoryStore.set(key, val)
}

export function emitFolderCollapsedChange() {
  setStorageItem('folder-collapsed-version', String(Date.now()))
  for (const fn of folderCollapsedListeners) fn()
}

export function useFolderCollapsedState() {
  return useSyncExternalStore(
    (cb) => {
      folderCollapsedListeners.add(cb)
      return () => folderCollapsedListeners.delete(cb)
    },
    () => {
      return getStorageItem('folder-collapsed-version') || '0'
    },
  )
}

/**
 * Modular AddOn class for Folder / Location Filter operations.
 * Handles building Location section items, counting packages/content by location,
 * matching packages against location filters using current or original offload directory,
 * and managing collapsible nested folder states.
 * Prefix debug logs with [FolderFilter].
 */
export class FolderFilterAddon {
  static LS_PREFIX = 'folder-collapsed:'

  /**
   * Check if a folder item is collapsed. Default is true (collapsed).
   * @param {string} itemValue
   * @param {boolean} [defaultValue=true]
   * @returns {boolean}
   */
  static isFolderCollapsed(itemValue, defaultValue = true) {
    const val = getStorageItem(FolderFilterAddon.LS_PREFIX + itemValue)
    if (val === null) return defaultValue
    return val === '1'
  }

  /**
   * Set the collapsed state for a folder item.
   * @param {string} itemValue
   * @param {boolean} collapsed
   */
  static setFolderCollapsed(itemValue, collapsed) {
    setStorageItem(FolderFilterAddon.LS_PREFIX + itemValue, collapsed ? '1' : '0')
    console.log('[FolderFilter] setFolderCollapsed:', itemValue, collapsed)
    emitFolderCollapsedChange()
  }

  /**
   * Toggle the collapsed state for a folder item.
   * @param {string} itemValue
   * @param {boolean} [defaultValue=true]
   */
  static toggleFolderCollapsed(itemValue, defaultValue = true) {
    const current = FolderFilterAddon.isFolderCollapsed(itemValue, defaultValue)
    FolderFilterAddon.setFolderCollapsed(itemValue, !current)
  }

  /**
   * Collapse all collapsible items.
   * @param {Array<object>} items
   */
  static collapseAllFolders(items = []) {
    for (const item of items) {
      if (item.hasChildren) {
        setStorageItem(FolderFilterAddon.LS_PREFIX + item.value, '1')
      }
    }
    console.log('[FolderFilter] collapseAllFolders called')
    emitFolderCollapsedChange()
  }

  /**
   * Expand all collapsible items.
   * @param {Array<object>} items
   */
  static expandAllFolders(items = []) {
    for (const item of items) {
      if (item.hasChildren) {
        setStorageItem(FolderFilterAddon.LS_PREFIX + item.value, '0')
      }
    }
    console.log('[FolderFilter] expandAllFolders called')
    emitFolderCollapsedChange()
  }

  /**
   * Filter location items based on ancestor collapse states.
   * An item is visible if all of its ancestors are expanded.
   * @param {Array<object>} items - Full list of location items.
   * @returns {Array<object>} List of visible items.
   */
  static filterVisibleItems(items = []) {
    const itemMap = new Map(items.map((i) => [i.value, i]))

    return items.filter((item) => {
      let curr = item
      while (curr && curr.parentValue) {
        if (FolderFilterAddon.isFolderCollapsed(curr.parentValue, true)) {
          return false
        }
        curr = itemMap.get(curr.parentValue)
      }
      return true
    })
  }
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

  // [AddOn] Folder_Begin
  /**
   * Calculate location counts for "All", "Offloaded", each offload directory, and nested subfolders down to full depth.
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

    // Collect all known subfolders at all depths from allItems (or filteredItems if allItems not provided)
    const discoverySource = allItems && allItems.length > 0 ? allItems : filteredItems
    for (const item of discoverySource) {
      const pkg = getPkgFn ? getPkgFn(item) : item
      const effDirId = FolderFilterAddon.getEffectiveLibraryDirId(pkg)
      if (effDirId != null) {
        const dirId = String(effDirId)
        if (!knownSubfoldersByDir[dirId]) knownSubfoldersByDir[dirId] = new Set()
        const parts = FolderFilterAddon.getSubpathParts(pkg)
        let accumulatedPath = ''
        for (let i = 0; i < parts.length; i++) {
          accumulatedPath = accumulatedPath ? `${accumulatedPath}/${parts[i]}` : parts[i]
          knownSubfoldersByDir[dirId].add(accumulatedPath)
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
        let accumulatedPath = ''
        for (let i = 0; i < parts.length; i++) {
          accumulatedPath = accumulatedPath ? `${accumulatedPath}/${parts[i]}` : parts[i]
          const subKey = `${dirId}:${accumulatedPath}`
          offloadedBySubfolder[subKey] = (offloadedBySubfolder[subKey] || 0) + 1
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
  // [AddOn] Folder_Begin

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

  // [AddOn] Folder_Begin
  /**
   * Check if a package matches the location filter value based on current or originating directory at any folder depth.
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
        if (subpathParts.length < subfolderParts.length) return false
        for (let i = 0; i < subfolderParts.length; i++) {
          if (subpathParts[i] !== subfolderParts[i]) return false
        }
      }
      return true
    }

    return true
  }
  // [AddOn] Folder_Begin

  // [AddOn] Folder_Begin
  /**
   * Build Location FilterPanel section items for "All", "Offloaded", offloaded directories, and nested subfolders down to full depth.
   * @param {Array<object>} auxDirs - List of auxiliary library directories.
   * @param {object} counts - Counts from calculateLocationCounts.
   * @returns {Array<object>} Filter items list with level properties.
   */
  static buildLocationFilterItems(auxDirs = [], counts = {}) {
    const { all = 0, offloaded = 0, offloadedByDir = {}, offloadedBySubfolder = {}, knownSubfoldersByDir = {} } = counts

    const validAuxDirs = auxDirs.filter((d) => !d.archive)

    const items = [
      { value: 'all', label: 'All', count: all, level: 0, parentValue: null },
      {
        value: 'offloaded',
        label: 'Offloaded',
        count: offloaded,
        level: 0,
        parentValue: null,
      },
    ]

    for (const dir of validAuxDirs) {
      const dirId = String(dir.id)
      const dirLabel = dir.label || (dir.path ? dir.path.split(/[/\\]/).pop() : `Offload ${dir.id}`)

      // Collect all subfolder paths for this directory
      const folderPaths = new Set(knownSubfoldersByDir[dirId] || [])
      const prefix = `${dirId}:`
      for (const key of Object.keys(offloadedBySubfolder)) {
        if (key.startsWith(prefix)) {
          const folderName = key.slice(prefix.length)
          if (folderName) folderPaths.add(folderName)
        }
      }

      // Ensure all parent paths for every subfolder are included in folderPaths
      const allPaths = new Set()
      for (const fPath of folderPaths) {
        const parts = fPath.split('/').filter(Boolean)
        let acc = ''
        for (let i = 0; i < parts.length; i++) {
          acc = acc ? `${acc}/${parts[i]}` : parts[i]
          allPaths.add(acc)
        }
      }

      // Build tree map: parentPath -> Set of child folder names
      const childrenMap = new Map() // parentPath ("" for top level) -> Set<childFolderName>
      for (const fPath of allPaths) {
        const parts = fPath.split('/').filter(Boolean)
        const parentPath = parts.slice(0, -1).join('/')
        const childName = parts[parts.length - 1]
        if (!childrenMap.has(parentPath)) {
          childrenMap.set(parentPath, new Set())
        }
        childrenMap.get(parentPath).add(childName)
      }

      items.push({
        value: `offloaded:${dir.id}`,
        label: dirLabel,
        count: offloadedByDir[dirId] || 0,
        level: 1,
        parentValue: 'offloaded',
      })

      // Recursive function to append items in tree order down to full depth
      const appendChildren = (parentPath, depth) => {
        const childSet = childrenMap.get(parentPath)
        if (!childSet || childSet.size === 0) return

        const sortedChildren = Array.from(childSet).sort((a, b) => a.localeCompare(b))
        for (const childName of sortedChildren) {
          const fullPath = parentPath ? `${parentPath}/${childName}` : childName
          const subKey = `${dirId}:${fullPath}`
          const itemValue = `offloaded:${dir.id}:${fullPath}`
          const itemParentValue = parentPath ? `offloaded:${dir.id}:${parentPath}` : `offloaded:${dir.id}`

          items.push({
            value: itemValue,
            label: childName,
            count: offloadedBySubfolder[subKey] || 0,
            level: 2 + depth,
            parentValue: itemParentValue,
          })

          appendChildren(fullPath, depth + 1)
        }
      }

      appendChildren('', 0)
    }

    const parentValues = new Set(items.map((i) => i.parentValue).filter(Boolean))
    for (const item of items) {
      item.hasChildren = parentValues.has(item.value)
    }

    console.log('[FolderFilter] Built location filter items:', items)
    return items
  }
  // [AddOn] Folder_Begin
}
// [AddOn] FolderFilter_End
