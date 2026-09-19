// [AddOn] Multidrive_Begin
import { copyFile, unlink, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { recordOwnedPath, recordOwnedDirChain } from '../watcher.js'

/**
 * AddOn helper module for MultiDrive cross-device file move functionality.
 * Handles EXDEV errors during rename across separate drives or filesystems.
 * Prefix logs with [Multidrive].
 */

/**
 * Perform a cross-drive copy-and-unlink move when rename fails with EXDEV.
 *
 * @param {string} from - Source file path.
 * @param {string} to - Destination file path.
 * @returns {Promise<void>}
 */
export async function performCrossDriveMove(from, to) {
  console.log(`[Multidrive] Performing cross-drive move from ${from} to ${to}`)
  try {
    recordOwnedPath(from)
    recordOwnedPath(to)
    const destDir = dirname(to)
    recordOwnedDirChain(destDir, await mkdir(destDir, { recursive: true }))

    await copyFile(from, to)
    await unlink(from)
    console.log(`[Multidrive] Cross-drive move succeeded from ${from} to ${to}`)
  } catch (err) {
    console.error(`[Multidrive] Error during cross-drive move from ${from} to ${to}:`, err.message)
    // Clean up partial destination file if copy failed
    try {
      await unlink(to)
    } catch {}
    throw err
  }
}
// [AddOn] Multidrive_End
