/**
 * Home-subpath co-location: find a structured "home" for a `.var` inside a
 * target library dir so moves land beside an existing size-matched copy instead
 * of at the dir root.
 *
 * Walk order mirrors watcher `locateWalk` (DFS deeper-first, first claim wins).
 * Only non-root subpaths qualify — an empty home never overrides `sourceSubpath`
 * (`homeSubpath || sourceSubpath`), so structured sources are never flattened.
 *
 * The root-only exclusion is also what makes co-location safe for BrowserAssist
 * dirs: BA flattens its packages to the root and records the *real* restore folder
 * in a per-file sidecar, so a root copy's restore can point anywhere. By never
 * adopting a root copy as a home, we never let one of those "points elsewhere"
 * root sidecars steer a placement. The only homes we do adopt are non-root ones,
 * which we mirrored there ourselves (physical subpath == restore subpath) — so
 * co-locating onto them stays self-consistent. See `applyStorageState`.
 */

import { readdir, stat } from 'fs/promises'
import { join, relative, sep } from 'path'

/**
 * Walk `rootDir` once; for each filename in `sizeByFilename`, claim the deepest
 * size-matched copy at a non-root subpath.
 *
 * @param {string} rootDir absolute library dir path
 * @param {Map<string, number>} sizeByFilename filename → expected size_bytes
 * @returns {Promise<Map<string, string>>} filename → POSIX subpath (never '')
 */
export async function buildHomeSubpathMap(rootDir, sizeByFilename) {
  const out = new Map()
  if (!rootDir || !sizeByFilename?.size) return out
  const remaining = new Map(sizeByFilename)
  await walkHomes(rootDir, rootDir, remaining, out)
  return out
}

/**
 * Single-file convenience wrapper over `buildHomeSubpathMap`.
 * @returns {Promise<string>} POSIX subpath or '' when no size-matched home
 */
export async function findHomeSubpathInDir(rootDir, filename, sizeBytes) {
  if (!rootDir || !filename || sizeBytes == null) return ''
  const map = await buildHomeSubpathMap(rootDir, new Map([[filename, sizeBytes]]))
  return map.get(filename) || ''
}

/**
 * Build a home map for every package in `packageIndex` that has `size_bytes`.
 * The whole-index fallback for callers whose mover set isn't known upfront (e.g.
 * a toggle's dynamic cascade closure). Prefer `buildHomeSubpathMapFor` when the
 * exact filenames that will move are known — it lets the walk short-circuit and
 * skips statting unrelated same-named files.
 *
 * @param {string} rootDir
 * @param {Map<string, { size_bytes?: number }> | Iterable<[string, { size_bytes?: number }]>} packageIndex
 */
export async function buildHomeSubpathMapForIndex(rootDir, packageIndex) {
  const sizeBy = new Map()
  for (const [fn, p] of packageIndex) {
    if (p?.size_bytes != null) sizeBy.set(fn, p.size_bytes)
  }
  return buildHomeSubpathMap(rootDir, sizeBy)
}

/**
 * Build a home map for a known set of mover filenames, pulling each size from
 * `packageIndex`. Bounding `remaining` to just the movers lets `walkHomes`
 * terminate as soon as they're all found and stats only same-named files that
 * are actually moving — the fast path for bulk archive/offload/re-settle.
 *
 * @param {string} rootDir
 * @param {Iterable<string>} filenames mover filenames
 * @param {Map<string, { size_bytes?: number }>} packageIndex
 */
export async function buildHomeSubpathMapFor(rootDir, filenames, packageIndex) {
  const sizeBy = new Map()
  for (const fn of filenames) {
    const p = packageIndex.get(fn)
    if (p?.size_bytes != null) sizeBy.set(fn, p.size_bytes)
  }
  return buildHomeSubpathMap(rootDir, sizeBy)
}

async function walkHomes(root, dir, remaining, out) {
  if (remaining.size === 0) return
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  const subdirs = []
  const files = new Set()
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) subdirs.push(entry.name)
    else if (entry.isFile()) files.add(entry.name)
  }
  // Deeper first — first claim wins, so a nested copy beats a shallower one.
  for (const name of subdirs) {
    if (remaining.size === 0) return
    await walkHomes(root, join(dir, name), remaining, out)
  }
  if (remaining.size === 0) return

  const rel = relative(root, dir)
  const subpath = rel ? rel.split(sep).join('/') : ''
  // Root is never a useful home: `homeSubpath || sourceSubpath` would be a no-op,
  // AND a root-level copy in a BrowserAssist dir carries a sidecar whose restore
  // folder can point anywhere — skipping root keeps those out of co-location so
  // they can only ever be preserved/overwritten in place, never adopted as a home.
  if (!subpath) return

  // Iterate this dir's own files (bounded), not the whole `remaining` index.
  for (const name of files) {
    const sizeBytes = remaining.get(name)
    if (sizeBytes === undefined) continue
    const st = await stat(join(dir, name)).catch(() => null)
    if (!st || !st.isFile() || st.size !== sizeBytes) continue
    out.set(name, subpath)
    remaining.delete(name)
  }
}
