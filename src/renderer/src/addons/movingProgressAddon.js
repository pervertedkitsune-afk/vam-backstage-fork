// [AddOn] Progressbar_Begin
/**
 * Modular AddOn class for Moving/Activating/Disabling progress tracking and queueing.
 * Prefix logs with [MovingProgress].
 */
export class MovingProgressAddon {
  static taskQueue = Promise.resolve()

  // [AddOn] MultiProgress_Begin
  static queue = []
  static activeCount = 0
  static isProcessing = false

  static async getConcurrencySetting() {
    try {
      const val = await window.api.settings.get('concurrent_actions')
      const n = parseInt(val, 10)
      if (Number.isInteger(n) && n >= 1 && n <= 5) return n
    } catch {}
    return 1
  }

  static async processQueue() {
    if (MovingProgressAddon.isProcessing) return
    MovingProgressAddon.isProcessing = true

    try {
      const concurrency = await MovingProgressAddon.getConcurrencySetting()

      while (MovingProgressAddon.activeCount < concurrency && MovingProgressAddon.queue.length > 0) {
        const task = MovingProgressAddon.queue.shift()
        if (!task) break

        MovingProgressAddon.activeCount++
        MovingProgressAddon.runTask(task).finally(() => {
          MovingProgressAddon.activeCount--
          MovingProgressAddon.processQueue()
        })
      }
    } finally {
      MovingProgressAddon.isProcessing = false
    }
  }

  static async runTask(task) {
    const { id, fn, step, store } = task
    console.log(`[MovingProgress] Starting task ${id} for ${task.filename}`)
    store.updateItem(id, { status: 'active', progress: 10, step: step || 'Processing…' })
    try {
      const res = await fn()
      store.updateItem(id, { status: 'completed', progress: 100, step: 'Done' })
      task.resolve(res)
    } catch (err) {
      store.updateItem(id, { status: 'failed', error: err?.message || 'Operation failed', step: 'Failed' })
      task.reject(err)
    }
  }

  static enqueueTask({ filename, type, step, opFn, sizeBytes }, store) {
    if (!store) return opFn()

    const id = store.addItem({ filename, type, status: 'queued', progress: 0, step: 'Queued…', sizeBytes })

    return new Promise((resolve, reject) => {
      MovingProgressAddon.queue.push({
        id,
        filename,
        type,
        step,
        fn: opFn,
        resolve,
        reject,
        store,
      })
      MovingProgressAddon.processQueue()
    })
  }
  // [AddOn] MultiProgress_End

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
  static createItem({ id, filename, type, status = 'queued', progress = 0, step = '', error = null, sizeBytes = 0 }) {
    return {
      id: id || `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename: filename || 'Unknown Package',
      type: type || 'move', // 'move' | 'activate' | 'disable' | 'archive'
      status, // 'queued' | 'active' | 'completed' | 'failed'
      progress, // 0 - 100
      step: step || (type === 'activate' ? 'Activating…' : type === 'disable' ? 'Disabling…' : 'Moving…'),
      timestamp: Date.now(),
      error,
      // [AddOn] MultiProgress_Begin
      sizeBytes: sizeBytes || 0,
      // [AddOn] MultiProgress_End
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
   * Track an async operation on a package in the store via queue manager.
   * @param {object} params
   * @param {string} params.filename
   * @param {'move'|'activate'|'disable'|'archive'} params.type
   * @param {string} [params.step]
   * @param {function} params.opFn
   * @param {number} [params.sizeBytes]
   * @param {object} store
   * @returns {Promise<any>}
   */
  static trackOperation({ filename, type, step, opFn, sizeBytes }, store) {
    // [AddOn] MultiProgress_Begin
    return MovingProgressAddon.enqueueTask({ filename, type, step, opFn, sizeBytes }, store)
    // [AddOn] MultiProgress_End
  }

  /**
   * Track batch async operations on multiple packages in the store via queue manager.
   * @param {object} params
   * @param {Array<string>} params.filenames
   * @param {'move'|'activate'|'disable'|'archive'} params.type
   * @param {string} [params.step]
   * @param {function} [params.opFn]
   * @param {function} [params.singleOpFn]
   * @param {Map<string, object>} [params.packageMap]
   * @param {object} store
   * @returns {Promise<any>}
   */
  static trackBatchOperations({ filenames = [], type, step, opFn, singleOpFn, packageMap }, store) {
    if (!store || !filenames.length) return opFn ? opFn() : Promise.all(filenames.map(singleOpFn))

    // [AddOn] MultiProgress_Begin
    const promises = filenames.map((fn) => {
      const pkg = packageMap?.get?.(fn)
      const sizeBytes = pkg?.sizeBytes || 0
      const fnToRun = singleOpFn ? () => singleOpFn(fn) : () => opFn([fn])
      return MovingProgressAddon.enqueueTask(
        {
          filename: fn,
          type,
          step,
          opFn: fnToRun,
          sizeBytes,
        },
        store,
      )
    })

    return Promise.allSettled(promises).then((results) => {
      const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
      const rejected = results.filter((r) => r.status === 'rejected')
      if (rejected.length > 0 && fulfilled.length === 0) {
        throw rejected[0].reason
      }
      return fulfilled.length === 1 ? fulfilled[0] : { ok: true, results: fulfilled }
    })
    // [AddOn] MultiProgress_End
  }
}
// [AddOn] Progressbar_End
