// [AddOn] NoLabels_Begin
export const NO_LABEL_ID = '__no_label__'
export const NO_LABEL_NAME = 'No Labels'

const NO_LABEL_VALUES = new Set(['no label', 'nolabel', 'no labels', 'nolabels', NO_LABEL_ID])

export class NoLabelsAddon {
  /**
   * Checks if a string value represents the "no label" filter trigger.
   * @param {string|number} val
   * @returns {boolean}
   */
  static isNoLabelValue(val) {
    if (val === null || val === undefined) return false
    const str = String(val).trim().toLowerCase()
    return NO_LABEL_VALUES.has(str)
  }

  /**
   * Returns a synthetic label object representing "No Labels".
   * @param {number} [count=0]
   * @returns {{ id: string, name: string, isSynthetic: boolean, packageCount: number, contentCount: number }}
   */
  static getNoLabelItem(count = 0) {
    return {
      id: NO_LABEL_ID,
      name: NO_LABEL_NAME,
      isSynthetic: true,
      packageCount: count,
      contentCount: count,
    }
  }

  /**
   * Checks if haystack of label IDs or names is considered unlabelled (empty).
   * @param {Array} haystack
   * @returns {boolean}
   */
  static isUnlabelled(haystack) {
    return !haystack || haystack.length === 0
  }
}
// [AddOn] NoLabels_End
