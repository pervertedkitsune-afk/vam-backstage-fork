// [AddOn] DBBackup_Begin
/**
 * AddOn module for Database Backup and Restore functionality.
 * Prefix debug logs with [DBBackup].
 */

import yazl from 'yazl'
import yauzl from 'yauzl'
import fs from 'fs'
import path from 'path'
import { getDb, getDatabasePath, closeDatabase } from '../db.js'

export class DBBackup {
  /**
   * Generates default backup filename: vam-backstage-db-backup-YYYY-MM-DD.zip
   * @returns {string}
   */
  static getDefaultBackupFilename() {
    const today = new Date().toISOString().split('T')[0]
    return `vam-backstage-db-backup-${today}.zip`
  }

  /**
   * Backup the active database to a zip file at destinationPath.
   * Flushes WAL log prior to zipping.
   * @param {string} destinationPath
   * @returns {Promise<{ ok: boolean, error?: string, path?: string }>}
   */
  static async backupDatabase(destinationPath) {
    try {
      console.log(`[DBBackup] Starting database backup to ${destinationPath}`)
      const db = getDb()
      if (db) {
        // Truncate WAL to ensure backstage.db has all latest data
        db.pragma('wal_checkpoint(TRUNCATE)')
      }

      const dbPath = getDatabasePath()
      if (!fs.existsSync(dbPath)) {
        return { ok: false, error: 'Database file does not exist.' }
      }

      await new Promise((resolve, reject) => {
        const zipfile = new yazl.ZipFile()
        zipfile.addFile(dbPath, 'backstage.db')

        const writeStream = fs.createWriteStream(destinationPath)
        zipfile.outputStream
          .pipe(writeStream)
          .on('close', () => resolve())
          .on('error', (err) => reject(err))

        zipfile.end()
      })

      console.log(`[DBBackup] Database backup completed successfully at ${destinationPath}`)
      return { ok: true, path: destinationPath }
    } catch (err) {
      console.error(`[DBBackup] Backup failed:`, err)
      return { ok: false, error: err.message || 'Failed to create database backup.' }
    }
  }

  /**
   * Validates if zipPath contains a valid backstage.db entry.
   * @param {string} zipPath
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  static async validateBackupZip(zipPath) {
    return new Promise((resolve) => {
      if (!fs.existsSync(zipPath)) {
        return resolve({ valid: false, error: 'Selected zip file does not exist.' })
      }

      yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
        if (err || !zipfile) {
          return resolve({ valid: false, error: 'Invalid or corrupted zip archive.' })
        }

        let foundDbEntry = false

        zipfile.on('entry', (entry) => {
          // Check for backstage.db at root or filename backstage.db
          const entryName = entry.fileName.replace(/\\/g, '/')
          if (entryName === 'backstage.db') {
            foundDbEntry = true
          }
          zipfile.readEntry()
        })

        zipfile.on('end', () => {
          if (foundDbEntry) {
            resolve({ valid: true })
          } else {
            resolve({ valid: false, error: 'Zip archive does not contain backstage.db.' })
          }
        })

        zipfile.on('error', (zipErr) => {
          resolve({ valid: false, error: zipErr.message || 'Error reading zip archive.' })
        })

        zipfile.readEntry()
      })
    })
  }

  /**
   * Restores database from a zip file.
   * Extracts backstage.db from zip, closes current DB, overwrites backstage.db,
   * removes WAL/SHM files, and signals success.
   * @param {string} zipPath
   * @returns {Promise<{ ok: boolean, error?: string, needRestart?: boolean }>}
   */
  static async restoreDatabase(zipPath) {
    try {
      console.log(`[DBBackup] Validating zip for restore: ${zipPath}`)
      const validation = await this.validateBackupZip(zipPath)
      if (!validation.valid) {
        return { ok: false, error: validation.error }
      }

      const tempExtractPath = path.join(path.dirname(getDatabasePath()), `temp-restore-${Date.now()}.db`)

      await new Promise((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
          if (err || !zipfile) return reject(err || new Error('Failed to open zip archive.'))

          zipfile.on('entry', (entry) => {
            const entryName = entry.fileName.replace(/\\/g, '/')
            if (entryName === 'backstage.db') {
              zipfile.openReadStream(entry, (streamErr, readStream) => {
                if (streamErr || !readStream) return reject(streamErr || new Error('Failed to read entry stream.'))

                const writeStream = fs.createWriteStream(tempExtractPath)
                readStream.pipe(writeStream)
                writeStream.on('finish', () => resolve())
                writeStream.on('error', (wErr) => reject(wErr))
              })
            } else {
              zipfile.readEntry()
            }
          })

          zipfile.on('error', (zipErr) => reject(zipErr))
          zipfile.readEntry()
        })
      })

      if (!fs.existsSync(tempExtractPath) || fs.statSync(tempExtractPath).size === 0) {
        if (fs.existsSync(tempExtractPath)) fs.unlinkSync(tempExtractPath)
        return { ok: false, error: 'Extracted database file is empty or missing.' }
      }

      console.log(`[DBBackup] Closing active database before replacing...`)
      closeDatabase()

      const targetDbPath = getDatabasePath()
      const walPath = `${targetDbPath}-wal`
      const shmPath = `${targetDbPath}-shm`

      if (fs.existsSync(walPath)) {
        try { fs.unlinkSync(walPath) } catch (e) { console.warn('[DBBackup] Failed removing wal file:', e.message) }
      }
      if (fs.existsSync(shmPath)) {
        try { fs.unlinkSync(shmPath) } catch (e) { console.warn('[DBBackup] Failed removing shm file:', e.message) }
      }

      fs.copyFileSync(tempExtractPath, targetDbPath)
      fs.unlinkSync(tempExtractPath)

      console.log(`[DBBackup] Database file restored successfully to ${targetDbPath}`)
      return { ok: true, needRestart: true }
    } catch (err) {
      console.error(`[DBBackup] Restore failed:`, err)
      return { ok: false, error: err.message || 'Failed to restore database.' }
    }
  }
}
// [AddOn] DBBackup_End
