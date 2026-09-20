// [AddOn] ManualDependencies_Begin
import { describe, it, expect, vi } from 'vitest'
import { ManualDependencies } from './manual-dependencies.js'

describe('ManualDependencies AddOn', () => {
  it('correctly checks if package is a DEP', () => {
    expect(ManualDependencies.isDep({ isDirect: false })).toBe(true)
    expect(ManualDependencies.isDep({ isDirect: true })).toBe(false)
    expect(ManualDependencies.isDep({ is_direct: 0 })).toBe(true)
    expect(ManualDependencies.isDep({ is_direct: 1 })).toBe(false)
    expect(ManualDependencies.isDep(null)).toBe(false)
  })

  it('marks packages as DEP using demote function', async () => {
    const demoteFn = vi.fn().mockResolvedValue({ ok: true, count: 2 })
    const res = await ManualDependencies.markAsDep(['pkg1.var', 'pkg2.var'], demoteFn)
    expect(demoteFn).toHaveBeenCalledWith(['pkg1.var', 'pkg2.var'])
    expect(res).toEqual({ ok: true, count: 2 })
  })

  it('unmarks DEP using promote function', async () => {
    const promoteFn = vi.fn().mockResolvedValue({ ok: true, count: 1 })
    const res = await ManualDependencies.unmarkDep('pkg1.var', promoteFn)
    expect(promoteFn).toHaveBeenCalledWith(['pkg1.var'])
    expect(res).toEqual({ ok: true, count: 1 })
  })

  it('toggles DEP status appropriately', async () => {
    const demoteFn = vi.fn().mockResolvedValue({ ok: true })
    const promoteFn = vi.fn().mockResolvedValue({ ok: true })

    // Non-DEP package -> mark as DEP
    await ManualDependencies.toggleDep({ filename: 'a.var', isDirect: true }, demoteFn, promoteFn)
    expect(demoteFn).toHaveBeenCalledWith(['a.var'])

    // DEP package -> unmark DEP
    await ManualDependencies.toggleDep({ filename: 'b.var', isDirect: false }, demoteFn, promoteFn)
    expect(promoteFn).toHaveBeenCalledWith(['b.var'])
  })
})
// [AddOn] ManualDependencies_End
