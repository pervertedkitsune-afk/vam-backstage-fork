import { describe, expect, it } from 'vitest'
import { contentFlags, libraryFlags, wishlistFlags } from './search-text.js'

describe('libraryFlags', () => {
  it('splits nopreset vs extracted by checkmark state', () => {
    expect(
      libraryFlags({
        noLookPresetTag: true,
        hasExtractedAppearancePreset: false,
      }),
    ).toEqual(['dep', 'nopreset'])
    expect(
      libraryFlags({
        noLookPresetTag: true,
        hasExtractedAppearancePreset: true,
      }),
    ).toEqual(['dep', 'extracted'])
  })

  it('includes corrupted / broken / wishlist / favorite when set', () => {
    expect(libraryFlags({ isCorrupted: true })).toEqual(['dep', 'corrupted'])
    expect(libraryFlags({ broken: true })).toEqual(['dep', 'broken'])
    expect(libraryFlags({ wishlisted: true })).toEqual(['dep', 'wishlist'])
    expect(libraryFlags({ favoriteContentCount: 1 })).toEqual(['dep', 'favorite'])
    expect(libraryFlags({ favoriteContentCount: 0 })).toEqual(['dep'])
  })

  it('includes storage and status flags', () => {
    expect(libraryFlags({ isDirect: true, storageState: 'disabled' })).toEqual(['direct', 'disabled'])
    expect(libraryFlags({ isDirect: true, storageState: 'offloaded' })).toEqual(['direct', 'offloaded'])
    expect(libraryFlags({ isDirect: false, storageState: 'archived' })).toEqual(['dep', 'archived'])
    expect(libraryFlags({ isDirect: false, isOrphan: true })).toEqual(['dep', 'orphan'])
    expect(libraryFlags({ isDirect: true, isLocalOnly: true })).toEqual(['direct', 'local'])
  })

  it('always tags direct vs dep from isDirect', () => {
    expect(libraryFlags({ isDirect: true })).toEqual(['direct'])
    expect(libraryFlags({ isDirect: false })).toEqual(['dep'])
    expect(libraryFlags({})).toEqual(['dep'])
  })
})

describe('contentFlags', () => {
  it('includes favorite / hidden / extracted', () => {
    expect(contentFlags({ favorite: true })).toEqual(['favorite'])
    expect(contentFlags({ hidden: true })).toEqual(['hidden'])
    expect(contentFlags({ extractedFrom: 'Author.Pkg.1.var' })).toEqual(['extracted'])
    expect(contentFlags({ hasExtractedAppearancePreset: true })).toEqual(['extracted'])
  })

  it('normalizes subtype tag labels to single-token flags', () => {
    expect(contentFlags({ tag: { label: 'Legacy' } })).toEqual(['legacy'])
    expect(contentFlags({ tag: { label: 'Preset' } })).toEqual(['preset'])
    expect(contentFlags({ tag: { label: 'Skin Preset' } })).toEqual(['skinpreset'])
  })

  it('combines tag + extracted without duplicating', () => {
    expect(
      contentFlags({
        tag: { label: 'Legacy' },
        hasExtractedAppearancePreset: true,
      }),
    ).toEqual(['extracted', 'legacy'])
  })
})

describe('wishlistFlags', () => {
  it('includes unavailable when the hub snapshot is gone', () => {
    expect(wishlistFlags({ _unavailable: true })).toEqual(['unavailable'])
    expect(wishlistFlags({})).toEqual([])
  })

  it('includes installed only for direct library installs', () => {
    expect(wishlistFlags({ _installed: true, _isDirect: true })).toEqual(['installed'])
    expect(wishlistFlags({ _installed: true, _isDirect: false })).toEqual([])
    expect(wishlistFlags({ _installed: false, _isDirect: false })).toEqual([])
  })
})
