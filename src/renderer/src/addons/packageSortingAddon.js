// [AddOn] PackageSorting_Begin
import { useLibraryStore } from '../stores/useLibraryStore'
import { useContentStore } from '../stores/useContentStore'
import { displayName, contentPackageLabel } from '../lib/utils'

/**
 * AddOn module for package name and author sorting in Library and Content views,
 * and triggering an Ascending sort on rescan library.
 */
export class PackageSortingAddon {
  /**
   * Sort array of library items by package name or author name.
   * @param {Array} items
   * @param {'package'|'author'|null} sortColumn
   * @param {'asc'|'desc'} sortDirection
   * @returns {Array}
   */
  static sortLibraryItems(items, sortColumn, sortDirection = 'asc') {
    if (!items || !items.length || !sortColumn) return items
    const dir = sortDirection === 'desc' ? -1 : 1
    const sorted = [...items]

    sorted.sort((a, b) => {
      if (sortColumn === 'package') {
        const valA = String(a.packageName || a.title || displayName(a) || '')
        const valB = String(b.packageName || b.title || displayName(b) || '')
        return valA.localeCompare(valB) * dir
      } else if (sortColumn === 'author') {
        const valA = String(a.creator || '')
        const valB = String(b.creator || '')
        return valA.localeCompare(valB) * dir
      }
      return 0
    })

    return sorted
  }

  /**
   * Sort array of content items by package name or author name.
   * @param {Array} items
   * @param {'package'|'author'|null} sortColumn
   * @param {'asc'|'desc'} sortDirection
   * @returns {Array}
   */
  static sortContentItems(items, sortColumn, sortDirection = 'asc') {
    if (!items || !items.length || !sortColumn) return items
    const dir = sortDirection === 'desc' ? -1 : 1
    const sorted = [...items]

    sorted.sort((a, b) => {
      if (sortColumn === 'package') {
        const pkgA = a.sourcePackage ?? a.package
        const pkgB = b.sourcePackage ?? b.package
        const valA = String(pkgA?.packageName || pkgA?.title || contentPackageLabel(a) || '')
        const valB = String(pkgB?.packageName || pkgB?.title || contentPackageLabel(b) || '')
        return valA.localeCompare(valB) * dir
      } else if (sortColumn === 'author') {
        const authorA = String((a.sourcePackage ?? a.package)?.creator || a.creator || '')
        const authorB = String((b.sourcePackage ?? b.package)?.creator || b.creator || '')
        return authorA.localeCompare(authorB) * dir
      }
      return 0
    })

    return sorted
  }

  /**
   * Called whenever rescan library is triggered to reset/trigger sort by Ascending (Package Name / Name).
   */
  static triggerRescanSort() {
    try {
      const libStore = useLibraryStore.getState()
      if (libStore && typeof libStore.setPrimarySort === 'function') {
        libStore.setPrimarySort('Name')
      }
    } catch (err) {
      console.warn('[PackageSorting] Failed to set library primary sort:', err)
    }

    try {
      const contentStore = useContentStore.getState()
      if (contentStore && typeof contentStore.setPrimarySort === 'function') {
        contentStore.setPrimarySort('Package')
      }
    } catch (err) {
      console.warn('[PackageSorting] Failed to set content primary sort:', err)
    }
  }
}
// [AddOn] PackageSorting_End
