import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { mkTempVamDir, buildVar, placeVar, openTestDatabase } from '../../../test/fixtures/index.js'
import { closeDatabase, getAllPackages, getDb, setSetting } from '../db.js'
import { buildFromDb } from '../store.js'
import { ADDON_PACKAGES_FILE_PREFS } from '@shared/paths.js'
import {
  concreteDepFilename,
  isFlexibleFilename,
  isDepRefPresentLocally,
  integrateScannedPackage,
  integrateGraphPhase,
} from './manager.js'

// ── concreteDepFilename ────────────────────────────────────────────────────────
//
// Hub `getResourceDetail` returns dep entries whose `file.filename` is the
// dep-ref verbatim ("…latest", "…minN", or a concrete numeric); `latest_version`
// is the concrete integer the URL serves. concreteDepFilename builds
// "<packageName>.<latest_version>.var" from those two, returning null when the
// inputs can't produce a numeric on-disk filename. The plan's invariant: no
// flexible-ref tokens (.latest / .minN) ever land in `downloads.package_ref`.

describe('concreteDepFilename', () => {
  it('builds concrete filename from numeric latest_version', () => {
    expect(concreteDepFilename({ packageName: 'Author.Pkg', latest_version: 42 })).toBe('Author.Pkg.42.var')
  })

  it('accepts numeric strings as latest_version', () => {
    expect(concreteDepFilename({ packageName: 'Author.Pkg', latest_version: '42' })).toBe('Author.Pkg.42.var')
  })

  it('returns null when latest_version is missing', () => {
    expect(concreteDepFilename({ packageName: 'Author.Pkg' })).toBeNull()
  })

  it('returns null when packageName is missing', () => {
    expect(concreteDepFilename({ latest_version: 42 })).toBeNull()
  })

  it('returns null when latest_version is non-numeric', () => {
    expect(concreteDepFilename({ packageName: 'Author.Pkg', latest_version: 'latest' })).toBeNull()
    expect(concreteDepFilename({ packageName: 'Author.Pkg', latest_version: 'min5' })).toBeNull()
    expect(concreteDepFilename({ packageName: 'Author.Pkg', latest_version: '' })).toBeNull()
  })

  it('returns null when input itself is null or undefined', () => {
    expect(concreteDepFilename(null)).toBeNull()
    expect(concreteDepFilename(undefined)).toBeNull()
  })

  it('handles multi-dot package names', () => {
    expect(concreteDepFilename({ packageName: 'A.B.C', latest_version: 7 })).toBe('A.B.C.7.var')
  })
})

// ── isFlexibleFilename ─────────────────────────────────────────────────────────
//
// Defensive last-line check before insertDownload. True for ".latest" and
// ".minN" version segments (case-insensitive), false for concrete numeric
// versions. The whole point is to fail loud rather than write a flexible token
// into the downloads table.

describe('isFlexibleFilename', () => {
  it('flags .latest as flexible', () => {
    expect(isFlexibleFilename('Author.Pkg.latest.var')).toBe(true)
  })

  it('does not flag concrete numeric version', () => {
    expect(isFlexibleFilename('Author.Pkg.123.var')).toBe(false)
  })

  it('flags .min5 / .min10 / case variants', () => {
    expect(isFlexibleFilename('Author.Pkg.min5.var')).toBe(true)
    expect(isFlexibleFilename('Author.Pkg.min10.var')).toBe(true)
    expect(isFlexibleFilename('Author.Pkg.MIN3.var')).toBe(true)
  })

  it('returns false for empty / null / non-string input', () => {
    expect(isFlexibleFilename('')).toBe(false)
    expect(isFlexibleFilename(null)).toBe(false)
    expect(isFlexibleFilename(undefined)).toBe(false)
  })

  it('returns false for short non-package names (< 3 segments)', () => {
    expect(isFlexibleFilename('Too.var')).toBe(false)
    expect(isFlexibleFilename('latest.var')).toBe(false)
  })

  it('does not treat ".var" as a flexible "version" token — needs ≥3 stem segments', () => {
    expect(isFlexibleFilename('File.var')).toBe(false)
    expect(isFlexibleFilename('More.var')).toBe(false)
  })
})

// ── isDepRefPresentLocally ─────────────────────────────────────────────────────
//
// Install All used to toast Hub-unavailable built-ins as "dependencies unavailable"
// because it only checked exact filenames then asked findPackages. This helper is
// the local-presence gate: any version of the package in groupIndex counts, and
// full dep-refs go through resolveRef (exact / latest / fallback).

function indexes(filenames) {
  const packageIndex = new Map()
  const groupIndex = new Map()
  for (const fn of filenames) {
    const stem = fn.replace(/\.var$/i, '')
    const parts = stem.split('.')
    const version = parts.pop()
    const packageName = parts.join('.')
    packageIndex.set(fn, { filename: fn, package_name: packageName, version })
    if (!groupIndex.has(packageName)) groupIndex.set(packageName, [])
    groupIndex.get(packageName).push(fn)
  }
  return { packageIndex, groupIndex }
}

describe('isDepRefPresentLocally', () => {
  it('matches a full exact dep-ref against a local package', () => {
    const { packageIndex, groupIndex } = indexes(['MeshedVR.3PointLightSetup.1.var'])
    expect(isDepRefPresentLocally('MeshedVR.3PointLightSetup.1', packageIndex, groupIndex)).toBe(true)
  })

  it('matches .latest when any local version exists', () => {
    const { packageIndex, groupIndex } = indexes(['NoStage3.Hair_Long_Upswept_Top_Bun.2.var'])
    expect(isDepRefPresentLocally('NoStage3.Hair_Long_Upswept_Top_Bun.latest', packageIndex, groupIndex)).toBe(true)
  })

  it('matches a bare package name (creator.name) when any version is local', () => {
    // findPackages failures often surface bare names like the toast listed.
    const { packageIndex, groupIndex } = indexes(['MeshedVR.3PointLightSetup.1.var'])
    expect(isDepRefPresentLocally('MeshedVR.3PointLightSetup', packageIndex, groupIndex)).toBe(true)
  })

  it('returns false when the package is absent locally', () => {
    const { packageIndex, groupIndex } = indexes(['Other.Thing.1.var'])
    expect(isDepRefPresentLocally('MeshedVR.3PointLightSetup', packageIndex, groupIndex)).toBe(false)
    expect(isDepRefPresentLocally('MeshedVR.3PointLightSetup.latest', packageIndex, groupIndex)).toBe(false)
  })

  it('returns false for empty / null input', () => {
    const { packageIndex, groupIndex } = indexes([])
    expect(isDepRefPresentLocally('', packageIndex, groupIndex)).toBe(false)
    expect(isDepRefPresentLocally(null, packageIndex, groupIndex)).toBe(false)
  })
})

// ── integrateScannedPackage is_direct reconciliation ──────────────────────────
//
// The install/import path only ever sees a brand-new or resurrected-tombstone
// row (live packages short-circuit at findLocalByFilename), so it classifies
// authoritatively by install intent: direct intent ratchets up, dep intent
// resurrects a tombstone AS a dependency. A live present row (e.g. archived) is
// never demoted here — ratchet-up only. Watcher re-drop stays sticky (watcher.test.js).

describe('integrateScannedPackage — is_direct reconciliation', () => {
  let tmp
  const FN = 'Author.Role.1.var'
  const SCENE = 'Saves/scene/Demo.json'

  beforeEach(async () => {
    tmp = await mkTempVamDir()
    await openTestDatabase(tmp.dbPath)
    setSetting('vam_dir', tmp.vamDir)
    setSetting('auto_hide_deps', '1')
    buildFromDb()
  })

  afterEach(async () => {
    closeDatabase()
    if (tmp) await tmp.cleanup()
    delete process.env.VAM_DB_PATH
  })

  async function placeRoleVar() {
    const buf = await buildVar({
      meta: { packageName: 'Author.Role', creator: 'Author' },
      files: { [SCENE]: '{"atoms":[]}' },
    })
    return placeVar(tmp.addonPackages, FN, buf)
  }

  function seedTombstone({ isDirect }) {
    getDb()
      .prepare(
        `INSERT INTO packages (filename, creator, package_name, version, type, size_bytes, file_mtime,
           is_direct, storage_state, dep_refs, first_seen_at, missing_since)
         VALUES (?, 'Author', 'Author.Role', '1', 'Scenes', 100, 0, ?, 'enabled', '[]', 1000, unixepoch())`,
      )
      .run(FN, isDirect ? 1 : 0)
  }

  async function integrate(fullPath, isDirect) {
    const e = await integrateScannedPackage({ filename: FN, fullPath, isDirect, hubResourceId: null })
    expect(e).not.toBeNull()
    await integrateGraphPhase([e], { autoQueueDeps: false })
    return e
  }

  it('ratchets a tombstoned dep up to direct on explicit direct install', async () => {
    seedTombstone({ isDirect: false })
    const fullPath = await placeRoleVar()
    await integrate(fullPath, true)

    const row = getAllPackages().find((p) => p.filename === FN)
    expect(row).toBeDefined()
    expect(row.is_direct).toBe(1)
    expect(row.missing_since).toBeNull()
    // Fresh install intent restamps Recently.
    expect(row.first_seen_at).toBeGreaterThan(1000)
  })

  it('resurrects a tombstoned direct AS a dependency on dep-intent install', async () => {
    // is_direct on a tombstone is mostly the default and a gone package carries
    // weak role signal; a dep-intent reinstall classifies the reborn row a dep.
    seedTombstone({ isDirect: true })
    const fullPath = await placeRoleVar()
    await integrate(fullPath, false)

    const row = getAllPackages().find((p) => p.filename === FN)
    expect(row.is_direct).toBe(0)
    expect(row.missing_since).toBeNull()
    // Dep path must not restamp first_seen (not a user-facing reinstall).
    expect(row.first_seen_at).toBe(1000)
  })

  it('never demotes a live present (archived) row — ratchet-up only', async () => {
    // Archive is present + deliberate: a live row must not lose its direct role.
    // (In production such a row short-circuits before reaching integrate; this
    // locks the defensive branch that would protect it if it ever got here.)
    const fullPath = await placeRoleVar()
    getDb()
      .prepare(
        `INSERT INTO packages (filename, creator, package_name, version, type, size_bytes, file_mtime,
           is_direct, storage_state, dep_refs, first_seen_at)
         VALUES (?, 'Author', 'Author.Role', '1', 'Scenes', 100, 0, 1, 'archived', '[]', 1000)`,
      )
      .run(FN)
    buildFromDb()

    await integrate(fullPath, false)

    const row = getAllPackages().find((p) => p.filename === FN)
    expect(row.is_direct).toBe(1)
  })

  it('inserts a brand-new package as direct when install intent is direct', async () => {
    const fullPath = await placeRoleVar()
    await integrate(fullPath, true)
    expect(getAllPackages().find((p) => p.filename === FN).is_direct).toBe(1)
  })

  it('inserts a brand-new package as dep when install intent is dep', async () => {
    const fullPath = await placeRoleVar()
    await integrate(fullPath, false)
    expect(getAllPackages().find((p) => p.filename === FN).is_direct).toBe(0)
  })

  it('clears stale .hide sidecars when a tombstoned dep is promoted by direct install', async () => {
    seedTombstone({ isDirect: false })
    const stemDir = join(tmp.vamDir, ADDON_PACKAGES_FILE_PREFS, FN.replace(/\.var$/i, ''))
    await mkdir(join(stemDir, 'Saves', 'scene'), { recursive: true })
    const hidePath = join(stemDir, SCENE + '.hide')
    await writeFile(hidePath, '')
    expect(existsSync(hidePath)).toBe(true)

    const fullPath = await placeRoleVar()
    await integrate(fullPath, true)

    expect(getAllPackages().find((p) => p.filename === FN).is_direct).toBe(1)
    expect(existsSync(hidePath)).toBe(false)
  })

  it('writes .hide sidecars for a fresh dep install when auto_hide_deps is on', async () => {
    const fullPath = await placeRoleVar()
    await integrate(fullPath, false)

    const hidePath = join(
      tmp.vamDir,
      ADDON_PACKAGES_FILE_PREFS,
      FN.replace(/\.var$/i, ''),
      SCENE + '.hide',
    )
    expect(existsSync(hidePath)).toBe(true)
  })
})
