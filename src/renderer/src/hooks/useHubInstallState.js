import { useDownloadStore } from '@/stores/useDownloadStore'
import { useInstalledStore } from '@/stores/useInstalledStore'
import { isPackageArchived, isPackageInstalled } from '@shared/storage-state-predicates.js'
import { useShallow } from 'zustand/react/shallow'

const NOT_INSTALLED = Object.freeze({ storageState: null, isDirect: false, filename: null })

/**
 * Canonical install-status for a hub package. Reads from `useInstalledStore`.
 * Presence = `isPackageInstalled(storageState)`; CTA facets use `isDirect` +
 * `isPackageArchived(storageState)`.
 *
 * @param {string} hubResourceId
 * @returns {{ storageState: string|null, isDirect: boolean, filename: string|null }}
 */
function useInstallStatus(hubResourceId) {
  return useInstalledStore((s) => s.byHubResourceId.get(String(hubResourceId)) ?? NOT_INSTALLED)
}

/** Aggregate download progress for a hub resource and its dependency queue (matches Hub detail panel). */
function useHubInstallDlInfo(rid) {
  const r = String(rid)
  return useDownloadStore(
    useShallow((s) => {
      const main = s.byHubResourceId.get(r)
      if (!main) return null
      const related = s.items.filter(
        (d) => d.status !== 'cancelled' && (d.hub_resource_id === r || d.parent_ref === main.package_ref),
      )
      const total = related.length
      const completed = related.filter((d) => d.status === 'completed').length
      const failed = related.filter((d) => d.status === 'failed').length
      const hasActive = related.some((d) => d.status === 'active' || d.status === 'queued')
      if (!hasActive && completed === total) return null
      let totalSize = 0,
        loadedSize = 0
      for (const d of related) {
        const sz = d.file_size || 0
        totalSize += sz
        if (d.status === 'completed') loadedSize += sz
        else if (d.status === 'active') loadedSize += s.liveProgress[d.id]?.bytesLoaded ?? 0
      }
      const progress =
        totalSize > 0
          ? Math.round((loadedSize / totalSize) * 100)
          : total > 0
            ? Math.round((completed / total) * 100)
            : 0
      return {
        total,
        completed,
        failed,
        progress,
        active: hasActive,
        packageRef: main.package_ref || null,
      }
    }),
  )
}

/**
 * Pure Hub CTA state machine (download activity → presence facets → external/fail/install).
 * @param {{ storageState: string|null, isDirect: boolean, dlActive?: boolean, pendingInstall?: boolean, isExternal?: boolean, mainDlStatus?: string|null }}
 * @returns {'downloading'|'queued'|'archived'|'installed'|'installed-dep'|'external'|'failed'|'install'}
 */
export function resolveHubInstallState({
  storageState,
  isDirect,
  dlActive = false,
  pendingInstall = false,
  isExternal = false,
  mainDlStatus = null,
}) {
  const present = isPackageInstalled(storageState)
  if (dlActive) return 'downloading'
  if (pendingInstall) return 'queued'
  if (present && isPackageArchived(storageState)) return 'archived'
  if (present && isDirect) return 'installed'
  if (present) return 'installed-dep'
  if (isExternal) return 'external'
  if (mainDlStatus === 'failed') return 'failed'
  return 'install'
}

/**
 * Resolves the current install/download action state for a hub resource.
 * Returns a discriminated `state` string plus the underlying data each consumer needs.
 *
 * @param {string} rid - stringified hub resource_id
 * @param {{ isExternal: boolean }} opts
 * @returns {{ state: 'downloading'|'queued'|'archived'|'installed'|'installed-dep'|'external'|'failed'|'install', dlInfo, installStatus }}
 */
export function useHubInstallState(rid, { isExternal } = {}) {
  const installStatus = useInstallStatus(rid)
  const dlInfo = useHubInstallDlInfo(rid)
  const mainDlStatus = useDownloadStore((s) => {
    const d = s.byHubResourceId.get(rid)
    if (!d || d.status === 'completed' || d.status === 'cancelled') return null
    return d.status
  })
  const pendingInstall = useDownloadStore((s) => s.pendingInstalls.has(rid))
  const state = resolveHubInstallState({
    storageState: installStatus.storageState,
    isDirect: installStatus.isDirect,
    dlActive: !!dlInfo?.active,
    pendingInstall,
    isExternal,
    mainDlStatus,
  })

  return { state, dlInfo, installStatus }
}
