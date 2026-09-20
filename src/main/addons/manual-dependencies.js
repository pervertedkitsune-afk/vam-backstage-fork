// [AddOn] ManualDependencies_Begin
/**
 * AddOn module for Manual Dependencies functionality.
 * Prefix logs with [ManualDependencies].
 */

export class ManualDependencies {
  /**
   * Determine if a package is manually or auto set as DEP.
   * In VaM / this app, a package is considered a DEP if `isDirect === false` (`is_direct === 0`).
   * @param {object} pkg - Package object from DB/store.
   * @returns {boolean} True if package is a DEP package.
   */
  static isDep(pkg) {
    if (!pkg) return false
    if (pkg.isDirect !== undefined) return !pkg.isDirect
    if (pkg.is_direct !== undefined) return pkg.is_direct === 0
    return false
  }

  /**
   * Set a package (or list of packages) as manual DEP (demote to dependency).
   * @param {string|string[]} filenames - Filename or list of filenames.
   * @param {function} demoteFn - Async function executing DB/IPC demote.
   * @returns {Promise<object>} Result of demote operation.
   */
  static async markAsDep(filenames, demoteFn) {
    const list = Array.isArray(filenames) ? filenames : [filenames]
    console.log(`[ManualDependencies] Marking ${list.length} package(s) as DEP:`, list)
    if (typeof demoteFn === 'function') {
      return await demoteFn(list)
    }
    return { ok: true, count: list.length }
  }

  /**
   * Remove DEP status from a package (or list of packages) (promote to direct / installed).
   * @param {string|string[]} filenames - Filename or list of filenames.
   * @param {function} promoteFn - Async function executing DB/IPC promote.
   * @returns {Promise<object>} Result of promote operation.
   */
  static async unmarkDep(filenames, promoteFn) {
    const list = Array.isArray(filenames) ? filenames : [filenames]
    console.log(`[ManualDependencies] Unmarking DEP for ${list.length} package(s):`, list)
    if (typeof promoteFn === 'function') {
      return await promoteFn(list)
    }
    return { ok: true, count: list.length }
  }

  /**
   * Toggle DEP status for a package.
   * @param {object} pkg - Package object.
   * @param {function} demoteFn - Async function executing demote.
   * @param {function} promoteFn - Async function executing promote.
   * @returns {Promise<object>} Result of toggle operation.
   */
  static async toggleDep(pkg, demoteFn, promoteFn) {
    if (!pkg) throw new Error('[ManualDependencies] Package object required for toggle')
    const currentlyDep = this.isDep(pkg)
    if (currentlyDep) {
      return await this.unmarkDep(pkg.filename, promoteFn)
    } else {
      return await this.markAsDep(pkg.filename, demoteFn)
    }
  }
}
// [AddOn] ManualDependencies_End
