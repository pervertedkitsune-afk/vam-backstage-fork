// [AddOn] Progressbar_Begin
/**
 * Modular AddOn class for Moving/Activating/Disabling progress tracking and queueing.
 * Prefix logs with [MovingProgress].
 */
export class MovingProgressAddon {
  static taskQueue = Promise.resolve()

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
      type: type || 'move', // 'move' | 'activate' | 'disable' | 'archive'
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

  /**
   * Track an async operation on a package in the store via sequential queue.
   * @param {object} params
   * @param {string} params.filename
   * @param {'move'|'activate'|'disable'|'archive'} params.type
   * @param {string} [params.step]
   * @param {function} params.opFn
   * @param {object} store
   * @returns {Promise<any>}
   */
  static trackOperation({ filename, type, step, opFn }, store) {
    if (!store) return opFn()
    const id = store.addItem({ filename, type, status: 'queued', progress: 0, step: 'Queued…' })

    const promise = MovingProgressAddon.taskQueue.then(async () => {
      store.updateItem(id, { status: 'active', progress: 10, step: step || 'Processing…' })
      try {
        store.updateItem(id, { progress: 50, step: step || 'Applying changes…' })
        const res = await opFn()
        store.updateItem(id, { status: 'completed', progress: 100, step: 'Done' })
        return res
      } catch (err) {
        store.updateItem(id, { status: 'failed', error: err?.message || 'Operation failed', step: 'Failed' })
        throw err
      }
    })

    MovingProgressAddon.taskQueue = promise.catch(() => {})
    return promise
  }

  /**
   * Track batch async operations on multiple packages in the store via sequential queue.
   * @param {object} params
   * @param {Array<string>} params.filenames
   * @param {'move'|'activate'|'disable'|'archive'} params.type
   * @param {string} [params.step]
   * @param {function} params.opFn
   * @param {object} store
   * @returns {Promise<any>}
   */
  static trackBatchOperations({ filenames = [], type, step, opFn }, store) {
    if (!store || !filenames.length) return opFn()

    const itemIds = filenames.map((fn) =>
      store.addItem({ filename: fn, type, status: 'queued', progress: 0, step: 'Queued…' }),
    )

    const promise = MovingProgressAddon.taskQueue.then(async () => {
      itemIds.forEach((id) => store.updateItem(id, { status: 'active', progress: 10, step: step || 'Processing…' }))
      try {
        itemIds.forEach((id) => store.updateItem(id, { progress: 50, step: step || 'Applying changes…' }))
        const res = await opFn()
        itemIds.forEach((id) => store.updateItem(id, { status: 'completed', progress: 100, step: 'Done' }))
        return res
      } catch (err) {
        itemIds.forEach((id) =>
          store.updateItem(id, { status: 'failed', error: err?.message || 'Operation failed', step: 'Failed' }),
        )
        throw err
      }
    })

    MovingProgressAddon.taskQueue = promise.catch(() => {})
    return promise
  }
}
// [AddOn] Progressbar_End
