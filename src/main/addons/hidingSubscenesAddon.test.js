// [AddOn] HidingSubscenes_Begin
import { describe, it, expect } from 'vitest'
import { HidingSubscenesAddon } from './hidingSubscenesAddon.js'

describe('HidingSubscenesAddon', () => {
  it('correctly identifies subscene content items', () => {
    expect(HidingSubscenesAddon.isSubscene({ type: 'subscene' })).toBe(true)
    expect(HidingSubscenesAddon.isSubscene({ type: 'scene' })).toBe(false)
    expect(HidingSubscenesAddon.isSubscene({ type: 'hairItem' })).toBe(false)
    expect(HidingSubscenesAddon.isSubscene(null)).toBe(false)
    expect(HidingSubscenesAddon.isSubscene({})).toBe(false)
  })

  it('matchesRule returns true for subscene items regardless of package context', () => {
    const subsceneItem = { type: 'subscene', internalPath: 'Custom/SubScene/test.json' }
    const sceneItem = { type: 'scene', internalPath: 'Saves/scene/test.json' }

    const contexts = [
      { filename: 'a.var', is_direct: true, effective_type: 'SubScenes' },
      { filename: 'b.var', is_direct: false, effective_type: 'Scenes' },
      { filename: 'c.var', is_direct: true, effective_type: 'Other' },
    ]

    for (const ctx of contexts) {
      expect(HidingSubscenesAddon.matchesRule(ctx, subsceneItem)).toBe(true)
      expect(HidingSubscenesAddon.matchesRule(ctx, sceneItem)).toBe(false)
    }
  })
})
// [AddOn] HidingSubscenes_End
