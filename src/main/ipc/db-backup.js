// [AddOn] DBBackup_Begin
import { ipcMain, dialog, app } from 'electron'
import { DBBackup } from '../addons/db-backup.js'

export function registerDBBackupHandlers() {
  ipcMain.handle('db:backup', async (event) => {
    const defaultName = DBBackup.getDefaultBackupFilename()
    const win = event.sender.getOwnerBrowserWindow()
    const result = await dialog.showSaveDialog(win || undefined, {
      title: 'Backup Database',
      defaultPath: defaultName,
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    })

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true }
    }

    return await DBBackup.backupDatabase(result.filePath)
  })

  ipcMain.handle('db:restore', async (event) => {
    const win = event.sender.getOwnerBrowserWindow()
    const result = await dialog.showOpenDialog(win || undefined, {
      title: 'Restore Database',
      properties: ['openFile'],
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    })

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { ok: false, canceled: true }
    }

    const restoreResult = await DBBackup.restoreDatabase(result.filePaths[0])
    return restoreResult
  })

  ipcMain.handle('db:relaunch', () => {
    app.relaunch()
    app.exit(0)
  })
}
// [AddOn] DBBackup_End
