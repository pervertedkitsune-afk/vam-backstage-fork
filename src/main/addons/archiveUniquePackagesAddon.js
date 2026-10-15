// [AddOn] ArchiveUniquePackages_Begin
/**
 * AddOn module for Archiving non-Hub (unique/irreplaceable) packages on uninstall
 * and database cleanup.
 * Prefix debug logs with [ArchiveUniquePackages].
 */

import { mkdir, rename, unlink, access, copyFile } from 'fs/promises'
import { join } from 'path'
import { getSetting, setStorageState, setPackageDirect, forgetDeletedData } from '../db.js'
import { runLocalScan } from '../scanner/local.js'
import { buildFromDb } from '../store.js'
import { notify } from '../notify.js'
import { pkgVarPath } from '../library-dirs.js'
import { recordOwnedPath } from '../watcher.js'

export class ArchiveUniquePackagesAddon {
  /**
   * Get the configured Non-Hub Packages directory setting.
   * @returns {string|null}
   */
  static getNonHubDirectory() {
    const dir = getSetting('non_hub_packages_directory')
    if (dir && typeof dir === 'string' && dir.trim() !== '') {
      return dir.trim()
    }
    return null
  }

  /**
   * Check if a package is a non-Hub / irreplaceable package.
   * @param {string} filename - Package filename.
   * @param {Set<string>} replaceableSet - Set of Hub-replaceable package filenames.
   * @returns {boolean} True if the package cannot be downloaded from the Hub.
   */
  static isNonHubPackage(filename, replaceableSet) {
    if (!filename) return false
    if (!replaceableSet) return true
    return !replaceableSet.has(filename)
  }

  /**
   * Move a non-Hub package file to the "Non-Hub Packages" directory and update DB state.
   * @param {object} pkg - Package object from packageIndex.
   * @param {string} filename - Package filename.
   * @param {string} nonHubDir - Target Non-Hub directory path.
   * @returns {Promise<{ ok: boolean, movedTo?: string }>}
   */
  static async relocateNonHubPackage(pkg, filename, nonHubDir) {
    if (!nonHubDir) {
      return { ok: false }
    }

    const currentPath = pkgVarPath(pkg)
    if (!currentPath) {
      console.warn(`[ArchiveUniquePackages] Cannot find current path for ${filename}`)
      return { ok: false }
    }

    try {
      await mkdir(nonHubDir, { recursive: true })
      const destPath = join(nonHubDir, filename)

      // Record path with watcher so moves don't trigger external watcher events
      recordOwnedPath(currentPath)
      recordOwnedPath(destPath)

      // Move .var file
      try {
        await rename(currentPath, destPath)
      } catch (err) {
        console.log(`[ArchiveUniquePackages] Rename failed (${err.message}), trying copy + unlink for ${filename}`)
        await copyFile(currentPath, destPath)
        await unlink(currentPath)
      }

      // Also move .var.disabled marker if present
      const currentDisabledMarker = currentPath + '.disabled'
      const destDisabledMarker = destPath + '.disabled'
      try {
        await access(currentDisabledMarker)
        recordOwnedPath(currentDisabledMarker)
        recordOwnedPath(destDisabledMarker)
        await rename(currentDisabledMarker, destDisabledMarker)
      } catch {}

      // Update DB record: storage_state = 'disabled', is_direct = false, clear library_dir_id, store subpath or location
      setPackageDirect(filename, false)
      setStorageState(filename, 'disabled', null, nonHubDir)

      console.log(`[ArchiveUniquePackages] Relocated non-Hub package ${filename} to ${destPath}`)
      return { ok: true, movedTo: destPath }
    } catch (err) {
      console.error(`[ArchiveUniquePackages] Failed to relocate ${filename} to ${nonHubDir}:`, err)
      return { ok: false }
    }
  }

  /**
   * Clean up database keys for missing packages that were manually deleted.
   * Scans disk to tombstone missing files, hard-deletes tombstones and orphaned content labels via forgetDeletedData,
   * rebuilds the store and notifies renderer.
   * @param {string} vamDir - Main VaM directory path.
   * @returns {Promise<{ ok: boolean, removedPackages: number, removedContentLabels: number }>}
   */
  static async cleanupDatabase(vamDir) {
    try {
      if (vamDir) {
        await runLocalScan(vamDir)
      }
      const res = forgetDeletedData()
      buildFromDb()
      notify('packages:updated')
      notify('contents:updated')

      console.log(
        `[ArchiveUniquePackages] Database cleanup completed: removed ${res.packages} packages, ${res.contentLabels} orphaned content labels`,
      )
      return { ok: true, removedPackages: res.packages, removedContentLabels: res.contentLabels }
    } catch (err) {
      console.error('[ArchiveUniquePackages] Database cleanup failed:', err)
      throw err
    }
  }
}
// [AddOn] ArchiveUniquePackages_End
