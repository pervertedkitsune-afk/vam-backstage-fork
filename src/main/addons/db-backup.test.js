// [AddOn] DBBackup_Begin
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import yazl from 'yazl'
import { DBBackup } from './db-backup.js'
import { setDatabasePathOverride, openDatabase, closeDatabase, getDb } from '../db.js'

describe('DBBackup AddOn', () => {
  let tmpDir
  let dbPath

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-backup-test-'))
    dbPath = path.join(tmpDir, 'test-backstage.db')
    setDatabasePathOverride(dbPath)
    const db = openDatabase()
    db.prepare('CREATE TABLE test_table (id INTEGER PRIMARY KEY, val TEXT)').run()
    db.prepare("INSERT INTO test_table (val) VALUES ('hello')").run()
  })

  afterEach(() => {
    closeDatabase()
    setDatabasePathOverride(null)
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('generates correct default backup filename containing date and vam-backstage', () => {
    const fn = DBBackup.getDefaultBackupFilename()
    expect(fn).toMatch(/^vam-backstage-db-backup-\d{4}-\d{2}-\d{2}\.zip$/)
  })

  it('backs up database to a zip file', async () => {
    const backupZip = path.join(tmpDir, 'backup.zip')
    const result = await DBBackup.backupDatabase(backupZip)

    expect(result.ok).toBe(true)
    expect(fs.existsSync(backupZip)).toBe(true)

    const validation = await DBBackup.validateBackupZip(backupZip)
    expect(validation.valid).toBe(true)
  })

  it('validates invalid zip file and rejects non-db zip', async () => {
    const invalidZip = path.join(tmpDir, 'invalid.zip')
    await new Promise((resolve) => {
      const zip = new yazl.ZipFile()
      const dummyFile = path.join(tmpDir, 'dummy.txt')
      fs.writeFileSync(dummyFile, 'hello')
      zip.addFile(dummyFile, 'dummy.txt')
      const ws = fs.createWriteStream(invalidZip)
      zip.outputStream.pipe(ws).on('close', resolve)
      zip.end()
    })

    const validation = await DBBackup.validateBackupZip(invalidZip)
    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('Zip archive does not contain backstage.db.')
  })

  it('restores database successfully from zip', async () => {
    const backupZip = path.join(tmpDir, 'backup.zip')
    await DBBackup.backupDatabase(backupZip)

    // Modify current database
    const db = getDb()
    db.prepare("INSERT INTO test_table (val) VALUES ('modified')").run()
    const rowsBeforeRestore = db.prepare('SELECT * FROM test_table').all()
    expect(rowsBeforeRestore.length).toBe(2)

    // Restore from backup
    const restoreResult = await DBBackup.restoreDatabase(backupZip)
    expect(restoreResult.ok).toBe(true)
    expect(restoreResult.needRestart).toBe(true)

    // Re-open DB and verify data was restored to original 1 row
    const reopenedDb = openDatabase()
    const rowsAfterRestore = reopenedDb.prepare('SELECT * FROM test_table').all()
    expect(rowsAfterRestore.length).toBe(1)
    expect(rowsAfterRestore[0].val).toBe('hello')
  })
})
// [AddOn] DBBackup_End
