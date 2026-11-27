// [AddOn] DragnDrop_Begin
import { applyStorageState } from '../storage-state.js'
import { getAuxLibraryDirs } from '../library-dirs.js'
import { buildFromDb } from '../store.js'
import { notify } from '../notify.js'

/**
 * Main-process AddOn for dragging and dropping packages to move them to a folder under Locations.
 */
export class DragDropAddon {
  /**
   * Parse targetLocation string (e.g. 'offloaded:1', 'offloaded:1:Poses/Sitting', 'offloaded').
   * @param {string} targetLocation
   * @returns {{ dirId: number|null, subpath: string, storageState: string } | null}
   */
  static parseTargetLocation(targetLocation) {
    if (!targetLocation || typeof targetLocation !== 'string') return null

    if (targetLocation === 'offloaded') {
      const auxDirs = (getAuxLibraryDirs() || []).filter((d) => !d.archive)
      if (auxDirs.length === 0) return null
      return { dirId: auxDirs[0].id, subpath: '', storageState: 'offloaded' }
    }

    if (targetLocation.startsWith('offloaded:')) {
      const parts = targetLocation.slice('offloaded:'.length).split(':')
      const dirId = parseInt(parts[0], 10)
      if (isNaN(dirId)) return null
      const subpath = parts.length > 1 ? parts.slice(1).join(':') : ''
      return { dirId, subpath, storageState: 'offloaded' }
    }

    return null
  }

  /**
   * Move one or more packages directly to a Location folder.
   * @param {string[]} filenames
   * @param {string} targetLocation
   * @returns {Promise<{ ok: boolean, movedCount: number, error?: string, targetDirId?: number|null, targetSubpath?: string }>}
   */
  static async movePackagesToLocation(filenames, targetLocation) {
    const target = DragDropAddon.parseTargetLocation(targetLocation)
    if (!target) {
      return { ok: false, movedCount: 0, error: `Invalid target location: ${targetLocation}` }
    }

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return { ok: true, movedCount: 0 }
    }

    let movedCount = 0
    const total = filenames.length

    for (let i = 0; i < total; i++) {
      const filename = filenames[i]
      try {
        notify('moving:progress', {
          filename,
          bytesTransferred: 0,
          totalBytes: 100,
          progressPercent: Math.round(((i + 1) / total) * 100),
          step: `Moving package ${i + 1} of ${total} to folder…`,
        })

        const res = await applyStorageState(
          filename,
          {
            storageState: target.storageState,
            libraryDirId: target.dirId,
          },
          {
            targetSubpath: target.subpath,
          },
        )

        if (res?.ok) {
          movedCount++
        }
      } catch (err) {
        console.error(`[DragDropAddon] Failed to move ${filename} to ${targetLocation}:`, err)
      }
    }

    buildFromDb()
    notify('packages:updated')

    return {
      ok: true,
      movedCount,
      targetDirId: target.dirId,
      targetSubpath: target.subpath,
    }
  }
}
// [AddOn] DragnDrop_End
