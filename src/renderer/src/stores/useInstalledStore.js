import { create } from 'zustand'

/** Normalize Hub install-status entry. `storageState` null ⇒ not on disk. */
function normalizeEntry(storageState, isDirect, filename) {
  const st = storageState ?? null
  return {
    storageState: st,
    isDirect: !!st && !!isDirect,
    filename: st ? filename || null : null,
  }
}

/** Hub-side local presence for a resource. `storageState` null ⇒ not on disk. */
export const useInstalledStore = create((set, get) => ({
  byHubResourceId: new Map(),

  applyBatch: (entries) => {
    const prev = get().byHubResourceId
    let next
    for (const e of entries) {
      const key = String(e.hubResourceId)
      const entry = normalizeEntry(e.storageState, e.isDirect, e.filename)
      const old = prev.get(key)
      if (
        old &&
        old.storageState === entry.storageState &&
        old.isDirect === entry.isDirect &&
        old.filename === entry.filename
      ) {
        continue
      }
      if (!next) next = new Map(prev)
      next.set(key, entry)
    }
    if (next) set({ byHubResourceId: next })
  },

  update: (hubResourceId, storageState, isDirect, filename) => {
    const prev = get().byHubResourceId
    const key = String(hubResourceId)
    const entry = normalizeEntry(storageState, isDirect, filename)
    const old = prev.get(key)
    if (
      old &&
      old.storageState === entry.storageState &&
      old.isDirect === entry.isDirect &&
      old.filename === entry.filename
    ) {
      return
    }
    const next = new Map(prev)
    next.set(key, entry)
    set({ byHubResourceId: next })
  },
}))
