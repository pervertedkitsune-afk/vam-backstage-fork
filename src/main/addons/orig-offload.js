// [AddOn] OrigOffload_Begin
/**
 * AddOn helper module for Original Offload Directory functionality.
 * Prefix logs with [OrigOffload].
 */

/**
 * Resolve the original offload directory ID for a package when disabling with 'move-to-orig'.
 *
 * @param {object} pkg - The package object from store/DB.
 * @param {Array<object>} offloadAuxDirs - List of active offload library directories (ordered by sort_order).
 * @returns {number|null} The resolved library_dir_id or null if no offload dirs available.
 */
export function resolveOriginalOffloadDirId(pkg, offloadAuxDirs = []) {
  if (!offloadAuxDirs || offloadAuxDirs.length === 0) {
    console.warn('[OrigOffload] No offload directories registered.')
    return null
  }

  const validIds = new Set(offloadAuxDirs.map((d) => d.id))

  if (pkg?.original_library_dir_id != null && validIds.has(pkg.original_library_dir_id)) {
    console.log(
      `[OrigOffload] Found valid original_library_dir_id ${pkg.original_library_dir_id} for package ${pkg.filename || pkg.package_name}`,
    )
    return pkg.original_library_dir_id
  }

  // Fallback to the first offload directory in the ordered list
  const fallbackId = offloadAuxDirs[0].id
  console.log(
    `[OrigOffload] Package ${pkg?.filename || pkg?.package_name} has no valid original_library_dir_id (${pkg?.original_library_dir_id}). Falling back to first offload directory ${fallbackId}`,
  )
  return fallbackId
}
// [AddOn] OrigOffload_End
