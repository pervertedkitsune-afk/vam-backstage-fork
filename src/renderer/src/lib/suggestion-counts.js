/**
 * Parse a Hub-style comma-separated tag string into lowercased tokens.
 * Same shape as package `hubTags` / wishlist snapshot `tags`.
 */
export function parseCommaTags(raw) {
  if (!raw) return []
  return String(raw)
    .toLowerCase()
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Overall author/tag occurrence counts for autocomplete.
 * Filter-independent: callers must pass the full collection (packages,
 * wishlist items, …), not a facet-narrowed slice — otherwise typing a query
 * refilters the source set out from under the suggester.
 *
 * @param {Iterable} items
 * @param {{ author?: (item) => string|null|undefined, tags?: (item) => string|string[]|null|undefined }} get
 *        `tags` may be a comma-string or an already-parsed list
 * @returns {{ authors: Record<string, number>, tags: Record<string, number> }}
 */
export function suggestionCounts(items, get = {}) {
  const authors = {}
  const tags = {}
  // [AddOn] DependencySort_notagfilter_Begin
  let noTagCount = 0
  // [AddOn] DependencySort_notagfilter_End
  for (const item of items) {
    const a = get.author?.(item)
    const author = typeof a === 'string' ? a.trim() : ''
    if (author) authors[author] = (authors[author] || 0) + 1
    // Always normalize through parseCommaTags so keys stay lowercased even when
    // the accessor returns a pre-split list.
    const raw = get.tags?.(item)
    const list = parseCommaTags(Array.isArray(raw) ? raw.join(',') : raw)
    // [AddOn] DependencySort_notagfilter_Begin
    if (list.length === 0) {
      noTagCount++
    } else {
      for (const t of list) tags[t] = (tags[t] || 0) + 1
    }
    // [AddOn] DependencySort_notagfilter_End
  }
  // [AddOn] DependencySort_notagfilter_Begin
  if (noTagCount > 0) {
    tags['no tag'] = noTagCount
  }
  // [AddOn] DependencySort_notagfilter_End
  return { authors, tags }
}

/** Library/Content: package-level totals (creator + hubTags). */
export function packageSuggestionCounts(packages) {
  return suggestionCounts(packages, {
    author: (p) => p.creator,
    tags: (p) => p.hubTags,
  })
}
