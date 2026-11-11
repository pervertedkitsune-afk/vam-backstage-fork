// [AddOn] DupeTab_Begin
import { shell } from 'electron'
import { unlink } from 'fs/promises'
import {
  clearDuplicatePackages,
  batchInsertDuplicatePackages,
  getAllDuplicatePackages,
  deleteDuplicatePackageByPath,
} from '../db.js'
import { parseVarFilename } from '../scanner/var-reader.js'

export class DupeTabAddon {
  /**
   * Given scanned var files from all library directories (main, aux, offload, archive),
   * find duplicate packages that share identical name, creator, version, and file size.
   *
   * @param {Array<{ filename: string, fullPath: string, mtime: number, size: number, storageState: string, libraryDirId: number|null, subpath: string }>} allVarFiles
   * @returns {Array<object>} list of duplicate records
   */
  static findDuplicates(allVarFiles) {
    if (!Array.isArray(allVarFiles) || allVarFiles.length === 0) return []

    // Group by signature: package_name|creator|version|size
    const groups = new Map()
    for (const file of allVarFiles) {
      const parsed = parseVarFilename(file.filename)
      const creator = parsed?.creator || file.filename.split('.')[0] || ''
      const packageName = parsed?.packageName || file.filename.replace(/\.var$/i, '')
      const version = parsed?.version != null ? String(parsed.version) : ''
      const size = Number(file.size) || 0

      const key = `${packageName.toLowerCase()}::${creator.toLowerCase()}::${version}::${size}`
      let list = groups.get(key)
      if (!list) {
        list = []
        groups.set(key, list)
      }
      list.push({
        filePath: file.fullPath,
        filename: file.filename,
        packageName,
        creator,
        version,
        sizeBytes: size,
        fileMtime: file.mtime || 0,
        libraryDirId: file.libraryDirId ?? null,
        subpath: file.subpath || '',
        storageState: file.storageState || 'enabled',
      })
    }

    // Only keep entries belonging to groups with > 1 file
    const duplicates = []
    for (const list of groups.values()) {
      if (list.length > 1) {
        duplicates.push(...list)
      }
    }
    return duplicates
  }

  /**
   * Persist detected duplicates into the package_duplicates table.
   *
   * @param {Array<object>} duplicates
   */
  static syncDuplicates(duplicates) {
    clearDuplicatePackages()
    if (duplicates && duplicates.length > 0) {
      batchInsertDuplicatePackages(duplicates)
    }
  }

  /**
   * Retrieve all duplicate records from DB and group them together by signature.
   *
   * @returns {Array<object>} grouped duplicate packages
   */
  static getGroupedDuplicates() {
    const rawList = getAllDuplicatePackages()
    const groupsMap = new Map()

    for (const item of rawList) {
      const key = `${item.package_name.toLowerCase()}::${item.creator.toLowerCase()}::${item.version}::${item.size_bytes}`
      let group = groupsMap.get(key)
      if (!group) {
        group = {
          key,
          packageName: item.package_name,
          creator: item.creator,
          version: item.version,
          sizeBytes: item.size_bytes,
          count: 0,
          items: [],
        }
        groupsMap.set(key, group)
      }
      group.items.push(item)
      group.count++
    }

    return [...groupsMap.values()].filter((g) => g.count > 1)
  }

  /**
   * Remove a single chosen duplicate file by full path.
   * Uses shell.trashItem where possible, falling back to unlink.
   * Also deletes the record from package_duplicates.
   *
   * @param {string} filePath
   * @returns {Promise<{ ok: boolean, filePath: string, error?: string }>}
   */
  static async removeDuplicateFile(filePath) {
    if (!filePath) throw new Error('File path required to remove duplicate')
    try {
      try {
        await shell.trashItem(filePath)
      } catch {
        await unlink(filePath)
      }
      deleteDuplicatePackageByPath(filePath)
      return { ok: true, filePath }
    } catch (err) {
      console.warn(`[DupeTab] Failed to remove duplicate ${filePath}:`, err.message)
      throw err
    }
  }

  /**
   * Find all duplicate records that are "offloaded" where the group already has an "enabled" copy.
   *
   * @returns {Array<object>} list of items eligible for auto removal
   */
  static getOffloadedDuplicatesWithEnabledCopy() {
    const grouped = this.getGroupedDuplicates()
    const toRemove = []

    for (const group of grouped) {
      const hasEnabled = group.items.some((item) => item.storage_state === 'enabled')
      if (hasEnabled) {
        for (const item of group.items) {
          if (item.storage_state === 'offloaded') {
            toRemove.push(item)
          }
        }
      }
    }
    return toRemove
  }

  /**
   * Auto remove all duplicate files in "offloaded" state when an "enabled" copy exists in the same group.
   *
   * @returns {Promise<{ ok: boolean, count: number, removedFiles: string[] }>}
   */
  static async autoRemoveOffloadedDuplicates() {
    const toRemove = this.getOffloadedDuplicatesWithEnabledCopy()
    const removedFiles = []

    for (const item of toRemove) {
      try {
        await this.removeDuplicateFile(item.file_path)
        removedFiles.push(item.file_path)
      } catch (err) {
        console.warn(`[DupeTab] Auto remove failed for ${item.file_path}:`, err.message)
      }
    }

    return {
      ok: true,
      count: removedFiles.length,
      removedFiles,
    }
  }
}
// [AddOn] DupeTab_End
