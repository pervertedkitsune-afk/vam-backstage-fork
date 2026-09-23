// [AddOn] Progressbar_Begin
import { create } from 'zustand'
import { MovingProgressAddon } from '@/addons/movingProgressAddon'

export const useMovingProgressStore = create((set) => ({
  items: [],

  addItem: ({ filename, type = 'move', status = 'active', progress = 0, step = '', sizeBytes = 0 }) => {
    // [AddOn] MultiProgress_Begin
    const item = MovingProgressAddon.createItem({ filename, type, status, progress, step, sizeBytes })
    // [AddOn] MultiProgress_End
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

  // [AddOn] MultiProgress_Begin
  updateProgressByFilename: (filename, progress, step) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.filename === filename && item.status === 'active') {
          return {
            ...item,
            progress: Math.min(100, Math.max(0, Math.round(progress))),
            ...(step ? { step } : {}),
          }
        }
        return item
      }),
    }))
  },
  // [AddOn] MultiProgress_End

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
