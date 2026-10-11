// [AddOn] MissingDownload_Begin
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import { MissingDownloadAddon } from './missingDownloadAddon.js'
import { getSetting } from '../db.js'
import { getMainLibraryDirPath } from '../library-dirs.js'

vi.mock('../db.js', () => ({
  getSetting: vi.fn(),
}))

vi.mock('../library-dirs.js', () => ({
  getMainLibraryDirPath: vi.fn(),
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
}))

describe('MissingDownloadAddon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns configured download directory when setting exists and exists on disk', () => {
    vi.mocked(getSetting).mockReturnValue('/custom/downloads')
    vi.mocked(fs.existsSync).mockReturnValue(true)

    const dir = MissingDownloadAddon.getDownloadDirectory()

    expect(dir).toBe('/custom/downloads')
    expect(getSetting).toHaveBeenCalledWith('download_directory')
    expect(fs.existsSync).toHaveBeenCalledWith('/custom/downloads')
  })

  it('falls back to default main library directory when setting is missing or empty', () => {
    vi.mocked(getSetting).mockReturnValue('')
    vi.mocked(getMainLibraryDirPath).mockReturnValue('/default/AddonPackages')

    const dir = MissingDownloadAddon.getDownloadDirectory()

    expect(dir).toBe('/default/AddonPackages')
    expect(getMainLibraryDirPath).toHaveBeenCalled()
  })

  it('falls back to default main library directory when configured path does not exist on disk', () => {
    vi.mocked(getSetting).mockReturnValue('/non/existent/path')
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(getMainLibraryDirPath).mockReturnValue('/default/AddonPackages')

    const dir = MissingDownloadAddon.getDownloadDirectory()

    expect(dir).toBe('/default/AddonPackages')
    expect(fs.existsSync).toHaveBeenCalledWith('/non/existent/path')
    expect(getMainLibraryDirPath).toHaveBeenCalled()
  })
})
// [AddOn] MissingDownload_End
