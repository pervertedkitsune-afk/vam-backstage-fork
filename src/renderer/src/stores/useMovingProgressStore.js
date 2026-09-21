// [AddOn] Progressbar_Begin
import { create } from 'zustand'
import { MovingProgressAddon } from '@/addons/movingProgressAddon'

export const useMovingProgressStore = create((set, get) => ({
  items: [],

  addItem: ({ filename, type = 'move', status = 'active', progress = 0, step = '' }) => {
    const item = MovingProgressAddon.createItem({ filename, type, status, progress, step })
    set((state) => ({
      items: [item, ...state.items],
    }))
    console.log('[MovingProgress] Added item:', item)
    return item.id
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }))
    console.log(`[MovingProgress] Updated item ${id}:`, updates)
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
    console.log(`[MovingProgress] Removed item ${id}`)
  },

  clearCompleted: () => {
    set((state) => ({
      items: MovingProgressAddon.clearCompleted(state.items),
    }))
  },

  clearFailed: () => {
    set((state) => ({
      items: MovingProgressAddon.clearFailed(state.items),
    }))
  },

  clearAll: () => {
    set({ items: [] })
    console.log('[MovingProgress] Cleared all items')
  },
}))
// [AddOn] Progressbar_End
