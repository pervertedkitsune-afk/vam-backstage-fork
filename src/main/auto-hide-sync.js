import { getPackageIndex, getFilteredContents, effectivePackageType } from './store.js'
import { hidePackageContent, unhidePackageContent } from './vam-prefs.js'
import { computeAutoHidePathsForNewPackage } from './scanner/index.js'
import { extractedItemsFor } from './scenes/extracted-reconcile.js'
import { extractedHasSurvivor } from './scenes/extracted-lifecycle.js'
import { LOCAL_PACKAGE_FILENAME } from '@shared/local-package.js'

/**
 * After promote/demote (or install-path role ratchet), align `.hide` sidecars with
 * active auto-hide rules for both in-var content and extracted presets owned by
 * the package. Extracted presets are shared across versions, so the deps rule
 * uses "any candidate still direct" rather than only the package that just flipped.
 *
 * @param {string} vamDir
 * @param {string} filename
 * @param {boolean} isDirect — effective role after the flip (sticky/ratcheted)
 * @param {Array<{ internalPath: string, type: string }>|null} [contentItems]
 *   Optional scan-time items when the in-memory content index is not yet rebuilt
 *   (download integrate graph phase). Promote/demote omit this and use the store.
 */
export async function syncAutoHideAfterDirectChange(vamDir, filename, isDirect, contentItems = null) {
  const pkg = getPackageIndex().get(filename)
  if (!pkg) return
  const effectiveType = effectivePackageType(pkg)

  const pkgItems = contentItems
    ? contentItems.map((c) => ({ internalPath: c.internalPath, type: c.type }))
    : getFilteredContents({ packageFilename: filename }).map((c) => ({
        internalPath: c.internalPath,
        type: c.type,
      }))
  const hidePkg = new Set(computeAutoHidePathsForNewPackage(filename, effectiveType, isDirect, pkgItems))
  const pkgPaths = pkgItems.map((c) => c.internalPath)
  const pkgHide = pkgPaths.filter((p) => hidePkg.has(p))
  const pkgUnhide = pkgPaths.filter((p) => !hidePkg.has(p))
  if (pkgHide.length) await hidePackageContent(vamDir, filename, pkgHide)
  if (pkgUnhide.length) await unhidePackageContent(vamDir, filename, pkgUnhide)

  const pkgIndex = getPackageIndex()
  const candidateIsDirect = (cf) => (cf === filename ? isDirect : !!pkgIndex.get(cf)?.is_direct)
  const toHide = []
  const toUnhide = []
  for (const item of extractedItemsFor([filename])) {
    const anyDirect = extractedHasSurvivor(item.extractedCandidates, candidateIsDirect)
    const hide = computeAutoHidePathsForNewPackage(filename, effectiveType, anyDirect, [
      { internalPath: item.internal_path, type: item.type },
    ])
    if (hide.length > 0) toHide.push(item.internal_path)
    else toUnhide.push(item.internal_path)
  }
  if (toHide.length) await hidePackageContent(vamDir, LOCAL_PACKAGE_FILENAME, toHide)
  if (toUnhide.length) await unhidePackageContent(vamDir, LOCAL_PACKAGE_FILENAME, toUnhide)
}
