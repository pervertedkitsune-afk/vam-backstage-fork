// [AddOn] LagFix_Begin
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LagFixAddon } from './lagFixAddon'

describe('LagFixAddon', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('evicts oldest entries when capacity is exceeded and calls URL.revokeObjectURL', () => {
    const revokeMock = vi.fn()
    globalThis.URL.revokeObjectURL = revokeMock

    const cache = LagFixAddon.createBoundedBlobCache({ maxEntries: 3 })
    cache.set('key1', 'blob:http://localhost/1')
    cache.set('key2', 'blob:http://localhost/2')
    cache.set('key3', 'blob:http://localhost/3')

    expect(cache.size).toBe(3)
    expect(revokeMock).not.toHaveBeenCalled()

    // Adding 4th item should evict oldest (key1)
    cache.set('key4', 'blob:http://localhost/4')

    expect(cache.size).toBe(3)
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key4')).toBe(true)
    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/1')
  })

  it('updates LRU access order on get', () => {
    const revokeMock = vi.fn()
    globalThis.URL.revokeObjectURL = revokeMock

    const cache = LagFixAddon.createBoundedBlobCache({ maxEntries: 3 })
    cache.set('key1', 'blob:http://localhost/1')
    cache.set('key2', 'blob:http://localhost/2')
    cache.set('key3', 'blob:http://localhost/3')

    // Access key1 to make it most recently used
    expect(cache.get('key1')).toBe('blob:http://localhost/1')

    // Now key2 is oldest, so setting key4 should evict key2
    cache.set('key4', 'blob:http://localhost/4')

    expect(cache.has('key1')).toBe(true)
    expect(cache.has('key2')).toBe(false)
    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/2')
  })

  it('revokes previous URL when key is overwritten with a different URL', () => {
    const revokeMock = vi.fn()
    globalThis.URL.revokeObjectURL = revokeMock

    const cache = LagFixAddon.createBoundedBlobCache({ maxEntries: 3 })
    cache.set('key1', 'blob:http://localhost/old')
    cache.set('key1', 'blob:http://localhost/new')

    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/old')
    expect(cache.get('key1')).toBe('blob:http://localhost/new')
  })

  it('revokes URL on delete and on clear', () => {
    const revokeMock = vi.fn()
    globalThis.URL.revokeObjectURL = revokeMock

    const cache = LagFixAddon.createBoundedBlobCache({ maxEntries: 5 })
    cache.set('a', 'blob:http://localhost/a')
    cache.set('b', 'blob:http://localhost/b')

    cache.delete('a')
    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/a')

    cache.clear()
    expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/b')
    expect(cache.size).toBe(0)
  })

  it('handles null and non-blob values without throwing', () => {
    const revokeMock = vi.fn()
    globalThis.URL.revokeObjectURL = revokeMock

    const cache = LagFixAddon.createBoundedBlobCache({ maxEntries: 2 })
    cache.set('nullKey', null)
    cache.set('otherKey', 'data:image/png;base64,...')
    cache.set('third', 'blob:http://localhost/3')

    expect(revokeMock).not.toHaveBeenCalled()
    expect(cache.size).toBe(2)
  })
})
// [AddOn] LagFix_End
