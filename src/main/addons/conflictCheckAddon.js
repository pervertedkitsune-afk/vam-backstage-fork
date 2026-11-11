// [AddOn] DupeTab_Begin
import { appendFile } from 'fs/promises'
import { join } from 'path'
import { getPackageIndex } from '../store.js'
import { resolveContentPath } from '../library-dirs.js'
import { readVar } from '../scanner/var-reader.js'
import { isPackageActive } from '@shared/storage-state-predicates.js'

export class ConflictCheckAddon {
  /**
   * Check for conflicts among all currently enabled packages.
   * A conflict occurs in VaM when two installed packages register an identical
   * virtual path into MVR.FileManagement.FileManager's internal Dictionary, causing:
   * Exception during package refresh System.ArgumentException: An element with the same key already exists in the dictionary.
   *
   * @param {string} [targetDir] - directory for writing package_conflicts.log
   * @returns {Promise<{ checkedCount: number, conflictCount: number, conflicts: Array<{ path: string, packages: string[] }>, logPath: string|null }>}
   */
  static async checkConflicts(targetDir) {
    const pkgIndex = getPackageIndex()
    const activePackages = []

    for (const [filename, pkg] of pkgIndex) {
      if (isPackageActive(pkg.storage_state)) {
        activePackages.push({ filename, pkg })
      }
    }

    // Map: virtualPath (lowercase) -> { originalPath: string, packages: Set<string> }
    const pathOwners = new Map()

    for (const { filename, pkg } of activePackages) {
      const fullPath = await resolveContentPath(pkg)
      if (!fullPath) continue
      try {
        const { fileList } = await readVar(fullPath)
        for (const f of fileList || []) {
          // VaM registers files under Custom/, Saves/, etc. meta.json is also parsed
          const normKey = f.path.trim().toLowerCase().replace(/\\/g, '/')
          let entry = pathOwners.get(normKey)
          if (!entry) {
            entry = { originalPath: f.path, packages: new Set() }
            pathOwners.set(normKey, entry)
          }
          entry.packages.add(filename)
        }
      } catch (err) {
        console.warn(`[ConflictCheck] Could not read file list for ${filename}:`, err.message)
      }
    }

    // Collect all collisions (virtual paths present in > 1 active package)
    const conflicts = []
    for (const [normKey, entry] of pathOwners.entries()) {
      if (entry.packages.size > 1) {
        conflicts.push({
          path: entry.originalPath || normKey,
          packages: [...entry.packages],
        })
      }
    }

    let logPath = null
    if (conflicts.length > 0) {
      logPath = await this.exportConflictLog(conflicts, targetDir)
    }

    return {
      checkedCount: activePackages.length,
      conflictCount: conflicts.length,
      conflicts,
      logPath,
    }
  }

  /**
   * Write conflict details to package_conflicts.log
   *
   * @param {Array<{ path: string, packages: string[] }>} conflicts
   * @param {string} [targetDir]
   * @returns {Promise<string|null>}
   */
  static async exportConflictLog(conflicts, targetDir) {
    if (!conflicts || conflicts.length === 0) return null
    try {
      const dir = targetDir || process.cwd()
      const logPath = join(dir, 'package_conflicts.log')
      const timestamp = new Date().toISOString()

      const lines = [
        `\n===================================================================`,
        `VaM Package Conflict Check Log - ${timestamp}`,
        `Identified ${conflicts.length} conflicting virtual file paths across enabled packages.`,
        `This conflict triggers VaM's FileManager.RegisterPackage System.ArgumentException.`,
        `===================================================================`,
      ]

      for (const item of conflicts) {
        lines.push(`Conflicting File/Path: ${item.path}`)
        lines.push(`Conflicting Packages: ${item.packages.join(', ')}`)
        lines.push(`Issue: Multiple enabled packages register the same file path in VaM dictionary.`)
        lines.push(`-------------------------------------------------------------------`)
      }
      lines.push('\n')

      await appendFile(logPath, lines.join('\n'), 'utf8')
      console.log(`[ConflictCheck] Exported ${conflicts.length} conflict(s) to ${logPath}`)
      return logPath
    } catch (err) {
      console.error('[ConflictCheck] Failed to export package conflict log:', err)
      return null
    }
  }
}
// [AddOn] DupeTab_End
