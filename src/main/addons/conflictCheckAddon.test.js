// [AddOn] DupeTab_Begin
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConflictCheckAddon } from './conflictCheckAddon.js'

vi.mock('../store.js', () => ({
  getPackageIndex: vi.fn(),
}))

vi.mock('../library-dirs.js', () => ({
  resolveContentPath: vi.fn(),
}))

vi.mock('../scanner/var-reader.js', () => ({
  readVar: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  appendFile: vi.fn().mockResolvedValue(undefined),
}))

import { getPackageIndex } from '../store.js'
import { resolveContentPath } from '../library-dirs.js'
import { readVar } from '../scanner/var-reader.js'

describe('ConflictCheckAddon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects conflicting virtual file paths across multiple enabled packages', async () => {
    const pkgIndex = new Map([
      ['PkgA.1.var', { filename: 'PkgA.1.var', storage_state: 'enabled' }],
      ['PkgB.1.var', { filename: 'PkgB.1.var', storage_state: 'enabled' }],
      ['PkgC.1.var', { filename: 'PkgC.1.var', storage_state: 'disabled' }],
    ])

    vi.mocked(getPackageIndex).mockReturnValue(pkgIndex)
    vi.mocked(resolveContentPath).mockImplementation(async (pkg) => `/path/${pkg.filename}`)

    vi.mocked(readVar).mockImplementation(async (path) => {
      if (path.includes('PkgA.1.var')) {
        return {
          fileList: [{ path: 'Custom/Atom/Person/Textures/face.png' }, { path: 'Custom/Scripts/uniqueA.cs' }],
        }
      }
      if (path.includes('PkgB.1.var')) {
        return {
          fileList: [
            { path: 'custom/atom/person/textures/face.png' }, // case-insensitive match
            { path: 'Custom/Scripts/uniqueB.cs' },
          ],
        }
      }
      return { fileList: [] }
    })

    const res = await ConflictCheckAddon.checkConflicts('/tmp')
    expect(res.checkedCount).toBe(2)
    expect(res.conflictCount).toBe(1)
    expect(res.conflicts[0].packages).toContain('PkgA.1.var')
    expect(res.conflicts[0].packages).toContain('PkgB.1.var')
    expect(res.logPath).toBe('/tmp/package_conflicts.log')
  })

  it('reports no conflicts when virtual paths are unique across enabled packages', async () => {
    const pkgIndex = new Map([
      ['Pkg1.1.var', { filename: 'Pkg1.1.var', storage_state: 'enabled' }],
      ['Pkg2.1.var', { filename: 'Pkg2.1.var', storage_state: 'enabled' }],
    ])

    vi.mocked(getPackageIndex).mockReturnValue(pkgIndex)
    vi.mocked(resolveContentPath).mockImplementation(async (pkg) => `/path/${pkg.filename}`)

    vi.mocked(readVar).mockImplementation(async (path) => {
      if (path.includes('Pkg1.1.var')) {
        return { fileList: [{ path: 'Custom/Scripts/Script1.cs' }] }
      }
      return { fileList: [{ path: 'Custom/Scripts/Script2.cs' }] }
    })

    const res = await ConflictCheckAddon.checkConflicts('/tmp')
    expect(res.checkedCount).toBe(2)
    expect(res.conflictCount).toBe(0)
    expect(res.logPath).toBeNull()
  })
})
// [AddOn] DupeTab_End
