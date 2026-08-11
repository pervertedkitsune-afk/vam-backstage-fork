import { describe, it, expect } from 'vitest'
import { join, normalize, sep } from 'path'
import { avatarFile } from './avatar-cache.js'

function escapesCacheRoot(root, basename) {
  const resolved = normalize(join(root, basename))
  const rootNorm = normalize(root)
  return resolved !== rootNorm && !resolved.startsWith(rootNorm + sep)
}

describe('avatarFile', () => {
  it('passes through path-safe ids (existing cache + future non-numeric)', () => {
    expect(avatarFile('129900', '0')).toBe('129900_0.jpg')
    expect(avatarFile(129900, 1776817697)).toBe('129900_1776817697.jpg')
    expect(avatarFile('user-abc', 'v2')).toBe('user-abc_v2.jpg')
    expect(avatarFile('550e8400-e29b-41d4-a716-446655440000', '0')).toBe(
      '550e8400-e29b-41d4-a716-446655440000_0.jpg',
    )
  })

  it('replaces non-whitelisted chars (collisions on garbage input are acceptable)', () => {
    expect(avatarFile('../../../tmp/evil', '0')).toBe('_________tmp_evil_0.jpg')
    expect(avatarFile('..\\..\\evil', 'x')).toBe('______evil_x.jpg')
  })

  it('never resolves outside the cache root', () => {
    const root = join('/tmp', 'avatar-cache')
    for (const [uid, date] of [
      ['129900', '0'],
      ['user-abc', 'v2'],
      ['../../../tmp/evil', 'payload.jpg'],
      ['..\\..\\evil', 'x'],
      ['..', '0'],
    ]) {
      expect(escapesCacheRoot(root, avatarFile(uid, date))).toBe(false)
    }
  })
})
