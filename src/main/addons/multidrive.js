// [AddOn] Multidrive_Begin
import { unlink, mkdir, stat as fsStat } from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { dirname, basename } from 'path'
import { recordOwnedPath, recordOwnedDirChain } from '../watcher.js'
import { notify } from '../notify.js'

/**
 * AddOn helper module for MultiDrive cross-device file move functionality.
 * Handles EXDEV errors during rename across separate drives or filesystems.
 * Prefix logs with [Multidrive].
 */

// [AddOn] MultiProgress_Begin
export async function copyFileWithProgress(from, to, customFilename) {
  const fileStat = await fsStat(from)
  const totalBytes = fileStat.size || 1
  const pkgFilename = customFilename || basename(from).replace(/\.disabled$/, '')

  return new Promise((resolve, reject) => {
    let bytesTransferred = 0
    let lastPercent = -1

    const readStream = createReadStream(from)
    const writeStream = createWriteStream(to)

    readStream.on('data', (chunk) => {
      bytesTransferred += chunk.length
      const percent = Math.min(100, Math.round((bytesTransferred / totalBytes) * 100))
      if (percent !== lastPercent) {
        lastPercent = percent
        notify('moving:progress', {
          filename: pkgFilename,
          bytesTransferred,
          totalBytes,
          progressPercent: percent,
        })
      }
    })

    readStream.on('error', (err) => {
      writeStream.destroy()
      reject(err)
    })

    writeStream.on('error', (err) => {
      readStream.destroy()
      reject(err)
    })

    writeStream.on('finish', () => {
      notify('moving:progress', {
        filename: pkgFilename,
        bytesTransferred: totalBytes,
        totalBytes,
        progressPercent: 100,
      })
      resolve()
    })

    readStream.pipe(writeStream)
  })
}
// [AddOn] MultiProgress_End

/**
 * Perform a cross-drive copy-and-unlink move when rename fails with EXDEV.
 *
 * @param {string} from - Source file path.
 * @param {string} to - Destination file path.
 * @param {string} [filename] - Optional package filename for progress tracking.
 * @returns {Promise<void>}
 */
export async function performCrossDriveMove(from, to, filename) {
  console.log(`[Multidrive] Performing cross-drive move from ${from} to ${to}`)
  try {
    recordOwnedPath(from)
    recordOwnedPath(to)
    const destDir = dirname(to)
    recordOwnedDirChain(destDir, await mkdir(destDir, { recursive: true }))

    // [AddOn] MultiProgress_Begin
    await copyFileWithProgress(from, to, filename)
    // [AddOn] MultiProgress_End
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
