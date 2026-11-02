// [AddOn] LoadingAddon_Begin
/**
 * LoadingAddon
 * Helper class for calculating moving and overall progress, formatting status bar
 * action details, and mapping progress steps to avoid hanging at 100%.
 */
export class LoadingAddon {
  /**
   * Calculates overall progress percentage (0 - 100) for a list of items.
   * Uses weights based on sizeBytes if available.
   *
   * @param {Array<object>} items
   * @returns {number} Integer between 0 and 100
   */
  static getOverallProgress(items = []) {
    if (!items || items.length === 0) return 0

    const activeOrQueued = items.filter((d) => d.status === 'active' || d.status === 'queued')
    if (activeOrQueued.length === 0) return 0

    const totalWeight = items.reduce((acc, item) => acc + (item.sizeBytes || 1024 * 1024), 0)
    if (totalWeight <= 0) return 0

    const completedWeight = items.reduce((acc, item) => {
      const size = item.sizeBytes || 1024 * 1024
      if (item.status === 'completed') return acc + size
      if (item.status === 'active') return acc + (size * (item.progress || 0)) / 100
      return acc
    }, 0)

    return Math.min(100, Math.max(0, Math.round((completedWeight / totalWeight) * 100)))
  }

  /**
   * Returns whether there is an active moving operation in progress.
   *
   * @param {Array<object>} items
   * @returns {boolean}
   */
  static isMovingActive(items = []) {
    return items.some((item) => item.status === 'active' || item.status === 'queued')
  }

  /**
   * Gets details of the currently active moving operation.
   *
   * @param {Array<object>} items
   * @returns {{ activeItem: object|null, activeCount: number, queuedCount: number, overallProgress: number }}
   */
  static getActiveMovingDetails(items = []) {
    const activeItems = items.filter((item) => item.status === 'active')
    const queuedItems = items.filter((item) => item.status === 'queued')
    const activeItem = activeItems[0] || queuedItems[0] || null
    const overallProgress = this.getOverallProgress(items)

    return {
      activeItem,
      activeCount: activeItems.length,
      queuedCount: queuedItems.length,
      overallProgress,
    }
  }

  /**
   * Formats a user-friendly label for the action in progress.
   *
   * @param {object|null} item
   * @returns {string}
   */
  static formatActionLabel(item) {
    if (!item) return 'Moving…'
    switch (item.type) {
      case 'activate':
        return 'Enabling…'
      case 'disable':
        return 'Disabling…'
      case 'archive':
        return 'Archiving…'
      case 'move':
      default:
        return 'Moving…'
    }
  }
}
// [AddOn] LoadingAddon_End
