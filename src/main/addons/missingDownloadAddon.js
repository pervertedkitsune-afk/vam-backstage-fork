// [AddOn] MissingDownload_Begin
/**
 * AddOn module for Missing File / Package Download directory management.
 * Prefix debug logs with [MissingDownload].
 */

import fs from 'fs'
import { getSetting } from '../db.js'
import { getMainLibraryDirPath } from '../library-dirs.js'

export class MissingDownloadAddon {
  /**
   * Resolves the target download directory.
   * Returns the user's configured Download Directory if set and existing,
   * otherwise falls back to the default main library directory.
   * @returns {string|null}
   */
  static getDownloadDirectory() {
    const customDir = getSetting('download_directory')
    if (customDir && typeof customDir === 'string' && customDir.trim() !== '') {
      const trimmed = customDir.trim()
      if (fs.existsSync(trimmed)) {
        console.log(`[MissingDownload] Using configured download directory: ${trimmed}`)
        return trimmed
      } else {
        console.warn(
          `[MissingDownload] Configured download directory does not exist (${trimmed}), falling back to default.`,
        )
      }
    }
    const defaultDir = getMainLibraryDirPath()
    console.log(`[MissingDownload] Using default download directory: ${defaultDir}`)
    return defaultDir
  }
}
// [AddOn] MissingDownload_End
