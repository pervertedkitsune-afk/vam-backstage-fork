// [AddOn] DependencyFix_Begin
/**
 * AddOn module for Dependency Fix functionality.
 * Prefix logs with [DependencyFix].
 */

import { setPackageDirect } from '../db.js'
import { buildGraphOnly, buildFromDb, getPackageIndex, getReverseDeps } from '../store.js'
import { notify } from '../notify.js'

export class DependencyFix {
  /**
   * Determine if a package is used by another package (has reverse dependencies).
   * @param {string} filename - Package filename.
   * @param {Map<string, Set<string>>} reverseDeps - Map of filename -> Set of dependent filenames.
   * @returns {boolean} True if the package is depended on / used by other packages.
   */
  static isUsedByOthers(filename, reverseDeps) {
    if (!filename || !reverseDeps) return false
    const dependents = reverseDeps.get(filename)
    return !!(dependents && dependents.size > 0)
  }

  /**
   * Check and fix dependencies for all packages in the store.
   * Any package that is "Used by" another package is marked as DEP (is_direct = 0).
   * @returns {Promise<{ ok: boolean, fixedCount: number, fixedFilenames: string[] }>}
   */
  static async fixAllDependencies() {
    buildGraphOnly()
    const pkgIndex = getPackageIndex()
    const revDeps = getReverseDeps()

    const fixedFilenames = []

    for (const [filename, pkg] of pkgIndex) {
      if (this.isUsedByOthers(filename, revDeps)) {
        // If it is currently direct (is_direct = 1), mark as DEP (is_direct = 0)
        if (pkg.is_direct) {
          setPackageDirect(filename, false)
          fixedFilenames.push(filename)
        }
      }
    }

    if (fixedFilenames.length > 0) {
      console.log(`[DependencyFix] Fixed ${fixedFilenames.length} package(s) as DEP:`, fixedFilenames)
      buildFromDb({ skipGraph: true })
      notify('packages:updated')
    } else {
      console.log('[DependencyFix] No packages needed dependency fix.')
    }

    return { ok: true, fixedCount: fixedFilenames.length, fixedFilenames }
  }

  /**
   * Classify newly added packages as DEP or Direct based on dependency graph.
   * If a package is used by another package, it is classified as DEP (is_direct = 0);
   * otherwise it is classified as Direct (is_direct = 1).
   * @param {string[]} filenames - Filenames of newly added packages.
   * @param {Map<string, object>} packageIndex
   * @param {Map<string, Set<string>>} reverseDeps
   * @returns {Array<[string, boolean]>} Array of [filename, isDirect] pairs.
   */
  static classifyPackages(filenames, packageIndex, reverseDeps) {
    const updates = []
    for (const fn of filenames) {
      const isUsed = this.isUsedByOthers(fn, reverseDeps)
      const isDirect = !isUsed
      updates.push([fn, isDirect])
      console.log(`[DependencyFix] Auto-classified ${fn}: isDirect = ${isDirect} (usedBy: ${isUsed})`)
    }
    return updates
  }
}
// [AddOn] DependencyFix_End
