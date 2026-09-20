// [AddOn] Progressbar_Begin
/**
 * Modular AddOn class for Moving/Activating/Disabling progress tracking.
 * Prefix logs with [MovingProgress].
 */
export class MovingProgressAddon {
  /**
   * Format operation badge count.
   * @param {Array<object>} items
   * @returns {number} Active/queued operations count
   */
  static getActiveCount(items = []) {
    return items.filter((item) => item.status === 'active' || item.status === 'queued').length
  }

  /**
   * Format operation error count.
   * @param {Array<object>} items
   * @returns {number} Failed operations count
   */
  static getErrorCount(items = []) {
    return items.filter((item) => item.status === 'failed').length
  }

  /**
   * Create a standardized operation item object.
   * @param {object} params
   * @returns {object}
   */
  static createItem({ id, filename, type, status = 'queued', progress = 0, step = '', error = null }) {
    return {
      id: id || `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename: filename || 'Unknown Package',
      type: type || 'move', // 'move' | 'activate' | 'disable'
      status, // 'queued' | 'active' | 'completed' | 'failed'
      progress, // 0 - 100
      step: step || (type === 'activate' ? 'Activating…' : type === 'disable' ? 'Disabling…' : 'Moving…'),
      timestamp: Date.now(),
      error,
    }
  }

  /**
   * Helper to filter completed items.
   * @param {Array<object>} items
   * @returns {Array<object>}
   */
  static clearCompleted(items = []) {
    console.log('[MovingProgress] Clearing completed tasks')
    return items.filter((item) => item.status !== 'completed')
  }

  /**
   * Helper to filter failed items.
   * @param {Array<object>} items
   * @returns {Array<object>}
   */
  static clearFailed(items = []) {
    console.log('[MovingProgress] Clearing failed tasks')
    return items.filter((item) => item.status !== 'failed')
  }
}
// [AddOn] Progressbar_End
