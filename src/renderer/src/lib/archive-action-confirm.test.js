import { describe, expect, it } from 'vitest'
import { archiveNeedsConfirmation, installFromArchiveNeedsConfirmation } from './archive-action-confirm.js'

describe('archiveNeedsConfirmation', () => {
  const oneDir = [{ id: 1, path: '/archive' }]
  const twoDirs = [
    { id: 1, path: '/a' },
    { id: 2, path: '/b' },
  ]

  it('is true when more than one archive dir', () => {
    expect(
      archiveNeedsConfirmation(twoDirs, {
        prune: { deleteCount: 0 },
        store: { storeCount: 0 },
      }),
    ).toBe(true)
  })

  it('is true when Hub-replaceable deps would be pruned', () => {
    expect(
      archiveNeedsConfirmation(oneDir, {
        prune: { deleteCount: 2 },
        store: { storeCount: 2 },
        catalogUnavailable: false,
      }),
    ).toBe(true)
  })

  it('is true when unneeded deps would be stored', () => {
    expect(
      archiveNeedsConfirmation(oneDir, {
        prune: { deleteCount: 0 },
        store: { storeCount: 3 },
      }),
    ).toBe(true)
  })

  it('is false for a pure package move (single dir, empty closure)', () => {
    expect(
      archiveNeedsConfirmation(oneDir, {
        prune: { deleteCount: 0 },
        store: { storeCount: 0 },
      }),
    ).toBe(false)
  })

  it('fails open when preview is missing', () => {
    expect(archiveNeedsConfirmation(oneDir, null)).toBe(true)
  })

  it('does not treat prune deletes as a choice when Hub catalog is unavailable', () => {
    expect(
      archiveNeedsConfirmation(oneDir, {
        prune: { deleteCount: 5 },
        store: { storeCount: 0 },
        catalogUnavailable: true,
      }),
    ).toBe(false)
  })
})

describe('installFromArchiveNeedsConfirmation', () => {
  it('is false when nothing is missing', () => {
    expect(installFromArchiveNeedsConfirmation({ missingDeps: 0 })).toBe(false)
    expect(installFromArchiveNeedsConfirmation([{ missingDeps: 0 }, { missingDeps: 0 }])).toBe(false)
  })

  it('is true when any package has missing deps', () => {
    expect(installFromArchiveNeedsConfirmation({ missingDeps: 2 })).toBe(true)
    expect(installFromArchiveNeedsConfirmation([{ missingDeps: 0 }, { missingDeps: 1 }])).toBe(true)
  })
})
