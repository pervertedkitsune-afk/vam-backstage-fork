// [AddOn] HidingSubscenes_Begin
/**
 * AddOn helper for Hiding Subscenes feature.
 * Provides subscene matching logic for auto-hide rules.
 */
export class HidingSubscenesAddon {
  /**
   * Check if a content item represents a subscene.
   * @param {object} contentItem - The content item object (e.g. { type: 'subscene' }).
   * @returns {boolean} True if the content item is a subscene.
   */
  static isSubscene(contentItem) {
    if (!contentItem) return false
    return contentItem.type === 'subscene'
  }

  /**
   * Rule predicate for auto-hiding subscenes across any package.
   * Does not affect main scenes and targets all subscene items.
   * @param {object} _pkgCtx - Package context ({ filename, is_direct, effective_type }).
   * @param {object} contentItem - Content item object.
   * @returns {boolean} True if the content item should be hidden under the subscenes auto-hide rule.
   */
  static matchesRule(_pkgCtx, contentItem) {
    return this.isSubscene(contentItem)
  }
}
// [AddOn] HidingSubscenes_End
