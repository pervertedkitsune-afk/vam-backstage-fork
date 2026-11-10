// [AddOn] DupeTab_Begin
import { ipcMain } from 'electron'
import { DupeTabAddon } from '../addons/dupeTabAddon.js'
import { notify } from '../notify.js'

export function registerDuplicateHandlers() {
  ipcMain.handle('duplicates:list', () => {
    return DupeTabAddon.getGroupedDuplicates()
  })

  ipcMain.handle('duplicates:remove', async (_, filePath) => {
    const result = await DupeTabAddon.removeDuplicateFile(filePath)
    notify('duplicates:updated')
    notify('packages:updated')
    return result
  })
}
// [AddOn] DupeTab_End
