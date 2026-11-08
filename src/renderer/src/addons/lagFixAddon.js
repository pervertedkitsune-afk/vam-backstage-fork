// [AddOn] LagFix_Begin
/**
 * LagFixAddon: Modular memory management and bounded caching utilities.
 * Prevents memory bloat and lag from accumulating thousands of un-revoked object URLs
 * and retained image instances in the renderer.
 */
export class LagFixAddon {
  /**
   * Bounded LRU Cache specifically designed for Blob URLs.
   * Ensures when an entry is evicted, updated, deleted, or cleared,
   * its associated object URL is properly revoked via URL.revokeObjectURL().
   */
  static createBoundedBlobCache({ maxEntries = 600 } = {}) {
    const cache = new Map() // key -> url (string | null)

    const revoke = (url) => {
      if (typeof url === 'string' && url.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // ignore error if URL is already revoked or invalid
        }
      }
    }

    const evictOldest = () => {
      if (cache.size <= maxEntries) return
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) {
        const oldUrl = cache.get(oldestKey)
        cache.delete(oldestKey)
        revoke(oldUrl)
      }
    }

    return {
      get(key) {
        if (!cache.has(key)) return undefined
        const val = cache.get(key)
        // Refresh LRU order on access
        cache.delete(key)
        cache.set(key, val)
        return val
      },
      has(key) {
        return cache.has(key)
      },
      set(key, url) {
        if (cache.has(key)) {
          const oldUrl = cache.get(key)
          if (oldUrl !== url) {
            revoke(oldUrl)
          }
          cache.delete(key)
        }
        cache.set(key, url)
        evictOldest()
      },
      delete(key) {
        if (!cache.has(key)) return false
        const oldUrl = cache.get(key)
        cache.delete(key)
        revoke(oldUrl)
        return true
      },
      clear() {
        for (const url of cache.values()) {
          revoke(url)
        }
        cache.clear()
      },
      get size() {
        return cache.size
      },
      keys() {
        return cache.keys()
      },
      values() {
        return cache.values()
      },
      entries() {
        return cache.entries()
      },
      [Symbol.iterator]() {
        return cache.entries()
      },
    }
  }

  /**
   * Default capacity for thumbnails and avatars in the renderer.
   */
  static get THUMBNAIL_CACHE_LIMIT() {
    return 600
  }

  static get AVATAR_CACHE_LIMIT() {
    return 300
  }

  static get RETAINED_THUMBS_LIMIT() {
    return 150
  }
}
// [AddOn] LagFix_End
