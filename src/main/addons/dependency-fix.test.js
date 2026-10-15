// [AddOn] DependencyFix_Begin
import { describe, it, expect, vi } from 'vitest'
import { DependencyFix } from './dependency-fix.js'

vi.mock('../db.js', () => ({
  setPackageDirect: vi.fn(),
}))

vi.mock('../store.js', () => ({
  buildGraphOnly: vi.fn(),
  buildFromDb: vi.fn(),
  getPackageIndex: vi.fn(),
  getReverseDeps: vi.fn(),
}))

vi.mock('../notify.js', () => ({
  notify: vi.fn(),
}))

import { setPackageDirect } from '../db.js'
import { getPackageIndex, getReverseDeps } from '../store.js'

describe('DependencyFix AddOn', () => {
  it('correctly checks if package is used by others', () => {
    const revDeps = new Map([
      ['used.var', new Set(['parent.var'])],
      ['unused.var', new Set()],
    ])

    expect(DependencyFix.isUsedByOthers('used.var', revDeps)).toBe(true)
    expect(DependencyFix.isUsedByOthers('unused.var', revDeps)).toBe(false)
    expect(DependencyFix.isUsedByOthers('missing.var', revDeps)).toBe(false)
    expect(DependencyFix.isUsedByOthers(null, revDeps)).toBe(false)
  })

  it('classifies packages as DEP or Direct based on reverse dependencies', () => {
    const revDeps = new Map([
      ['dep.var', new Set(['parent.var'])],
      ['leaf.var', new Set()],
    ])

    const result = DependencyFix.classifyPackages(['dep.var', 'leaf.var'], new Map(), revDeps)
    expect(result).toEqual([
      ['dep.var', false],
      ['leaf.var', true],
    ])
  })

  it('fixes all dependencies by marking packages with reverse deps as DEP', async () => {
    const pkgIndex = new Map([
      ['used_pkg.var', { filename: 'used_pkg.var', is_direct: 1 }],
      ['already_dep.var', { filename: 'already_dep.var', is_direct: 0 }],
      ['standalone_pkg.var', { filename: 'standalone_pkg.var', is_direct: 1 }],
    ])
    const revDeps = new Map([
      ['used_pkg.var', new Set(['consumer.var'])],
      ['already_dep.var', new Set(['consumer.var'])],
    ])

    vi.mocked(getPackageIndex).mockReturnValue(pkgIndex)
    vi.mocked(getReverseDeps).mockReturnValue(revDeps)

    const res = await DependencyFix.fixAllDependencies()

    expect(res.ok).toBe(true)
    expect(res.fixedCount).toBe(1)
    expect(res.fixedFilenames).toEqual(['used_pkg.var'])
    expect(setPackageDirect).toHaveBeenCalledWith('used_pkg.var', false)
  })

  // [AddOn] DependencySort_notagfilter_Begin
  it('skips packages that were manually set by the user', async () => {
    vi.clearAllMocks()
    const pkgIndex = new Map([
      ['manually_promoted.var', { filename: 'manually_promoted.var', is_direct: 1, is_manual_direct: 1 }],
      ['manually_demoted.var', { filename: 'manually_demoted.var', is_direct: 0, is_manual_direct: 0 }],
      ['auto_pkg.var', { filename: 'auto_pkg.var', is_direct: 1, is_manual_direct: null }],
    ])
    const revDeps = new Map([
      ['manually_promoted.var', new Set(['consumer.var'])],
      ['manually_demoted.var', new Set(['consumer.var'])],
      ['auto_pkg.var', new Set(['consumer.var'])],
    ])

    vi.mocked(getPackageIndex).mockReturnValue(pkgIndex)
    vi.mocked(getReverseDeps).mockReturnValue(revDeps)

    const res = await DependencyFix.fixAllDependencies()

    expect(res.ok).toBe(true)
    expect(res.fixedCount).toBe(1)
    expect(res.fixedFilenames).toEqual(['auto_pkg.var'])
    expect(setPackageDirect).toHaveBeenCalledWith('auto_pkg.var', false)
    expect(setPackageDirect).not.toHaveBeenCalledWith('manually_promoted.var', false)
  })
  // [AddOn] DependencySort_notagfilter_End
})
// [AddOn] DependencyFix_End
