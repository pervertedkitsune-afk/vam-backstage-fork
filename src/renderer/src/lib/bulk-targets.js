import { toast } from '@/components/Toast'
import { toastIfBulkToggleFailures } from '@/lib/packageStorageToggleResults'
import { useDownloadStore } from '@/stores/useDownloadStore'
import { useLibraryStore } from '@/stores/useLibraryStore'
import { useContentStore } from '@/stores/useContentStore'
// [AddOn] Progressbar_Begin
import { MovingProgressAddon } from '@/addons/movingProgressAddon'
import { useMovingProgressStore } from '@/stores/useMovingProgressStore'
// [AddOn] Progressbar_End
import { isPackageActive, isPackageArchived } from '@shared/storage-state-predicates.js'

/** Resolve the current library selection to package objects (selection order). */
export function resolveLibraryBulkPackages(state = useLibraryStore.getState()) {
  const { selection, packageByFilename } = state
  return selection.map((fn) => packageByFilename.get(fn)).filter(Boolean)
}

/** Resolve the current content selection to content items (selection order). */
export function resolveContentBulkItems(state = useContentStore.getState()) {
  const { selection, contents } = state
  if (!selection.length) return []
  const byId = new Map(contents.map((c) => [c.id, c]))
  return selection.map((id) => byId.get(id)).filter(Boolean)
}

/** Enable/disable UI state for a set of library packages. Empty selection => every flag false, `disabled`. */
export function libraryBulkEnabledState(items) {
  const n = items.filter((p) => isPackageActive(p.storageState)).length
  const allEnabled = items.length > 0 && n === items.length
  return {
    disabled: !items.length,
    allEnabled,
    allDisabled: items.length > 0 && n === 0,
    mixed: n > 0 && n < items.length,
    label: allEnabled ? 'Disable' : 'Enable',
  }
}

export async function runLibraryBulkToggleEnabled(items = resolveLibraryBulkPackages()) {
  if (useLibraryStore.getState().bulkToggleIntent) return
  const st = libraryBulkEnabledState(items)
  if (st.disabled) return
  const targets = st.mixed ? items.filter((p) => !isPackageActive(p.storageState)) : items
  if (!targets.length) return
  const enabled = st.allDisabled || st.mixed
  useLibraryStore.setState({ bulkToggleIntent: enabled ? 'enable' : 'disable' })
  const type = enabled ? 'activate' : 'disable'
  const filenames = targets.map((p) => p.filename)
  // [AddOn] MultiProgress_Begin
  const packageMap = useLibraryStore.getState().packageByFilename
  // [AddOn] MultiProgress_End
  try {
    // [AddOn] Progressbar_Begin
    // [AddOn] MultiProgress_Begin
    const res = await MovingProgressAddon.trackBatchOperations(
      {
        filenames,
        type,
        step: enabled ? 'Activating package…' : 'Disabling package…',
        singleOpFn: (fn) => window.api.packages.setEnabled([fn], enabled),
        packageMap,
      },
      useMovingProgressStore.getState(),
    )
    // [AddOn] MultiProgress_End
    // [AddOn] Progressbar_End
    toastIfBulkToggleFailures(res)
    await useLibraryStore.getState().fetchPackages()
  } catch (err) {
    toast(`Failed: ${err.message}`)
  } finally {
    useLibraryStore.setState({ bulkToggleIntent: null })
  }
}

export async function runLibraryBulkRemove(items = resolveLibraryBulkPackages()) {
  const direct = items.filter((p) => p.isDirect)
  const dep = items.filter((p) => !p.isDirect)
  // [AddOn] MultiProgress_Begin
  const packageMap = useLibraryStore.getState().packageByFilename
  // [AddOn] MultiProgress_End
  try {
    let relocated = 0
    if (direct.length) {
      const d = direct.map((p) => p.filename)
      // [AddOn] Progressbar_Begin
      // [AddOn] MultiProgress_Begin
      const res = await MovingProgressAddon.trackBatchOperations(
        {
          filenames: d,
          type: 'move',
          step: 'Moving / uninstalling package…',
          singleOpFn: (fn) => window.api.packages.uninstall(fn),
          packageMap,
        },
        useMovingProgressStore.getState(),
      )
      // [AddOn] MultiProgress_End
      // [AddOn] Progressbar_End
      for (const r of res?.results ?? (res ? [res] : [])) {
        if (r?.relocatedToArchive) relocated++
      }
    }
    if (dep.length) {
      const d = dep.map((p) => p.filename)
      // [AddOn] Progressbar_Begin
      // [AddOn] MultiProgress_Begin
      await MovingProgressAddon.trackBatchOperations(
        {
          filenames: d,
          type: 'move',
          step: 'Removing package…',
          singleOpFn: (fn) => window.api.packages.forceRemove(fn),
          packageMap,
        },
        useMovingProgressStore.getState(),
      )
      // [AddOn] MultiProgress_End
      // [AddOn] Progressbar_End
    }
    useLibraryStore.getState().clearSelection()
    await useLibraryStore.getState().fetchPackages()
    if (relocated) toast(`${relocated} moved to archive (still needed by archived packages)`, 'success')
  } catch (err) {
    toast(`Failed: ${err.message}`)
  }
}

export async function runLibraryBulkPromote(items = resolveLibraryBulkPackages()) {
  const fnames = items.filter((p) => !p.isDirect).map((p) => p.filename)
  if (!fnames.length) return
  try {
    await window.api.packages.promote(fnames.length === 1 ? fnames[0] : fnames, null)
    useLibraryStore.getState().clearSelection()
    await useLibraryStore.getState().fetchPackages()
  } catch (err) {
    toast(`Failed: ${err.message}`)
  }
}

export async function runLibraryBulkDemote(items = resolveLibraryBulkPackages()) {
  const fnames = items.filter((p) => p.isDirect).map((p) => p.filename)
  if (!fnames.length) return
  try {
    await window.api.packages.demote(fnames.length === 1 ? fnames[0] : fnames)
    useLibraryStore.getState().clearSelection()
    await useLibraryStore.getState().fetchPackages()
  } catch (err) {
    toast(`Failed: ${err.message}`)
  }
}

export async function runLibraryBulkInstallFromArchive(items = resolveLibraryBulkPackages()) {
  const fnames = items.filter((p) => isPackageArchived(p.storageState)).map((p) => p.filename)
  if (!fnames.length) return
  // [AddOn] MultiProgress_Begin
  const packageMap = useLibraryStore.getState().packageByFilename
  // [AddOn] MultiProgress_End
  try {
    // [AddOn] Progressbar_Begin
    // [AddOn] MultiProgress_Begin
    const res = await MovingProgressAddon.trackBatchOperations(
      {
        filenames: fnames,
        type: 'activate',
        step: 'Restoring & activating package from archive…',
        singleOpFn: (fn) => window.api.packages.installFromArchive([fn]),
        packageMap,
      },
      useMovingProgressStore.getState(),
    )
    // [AddOn] MultiProgress_End
    // [AddOn] Progressbar_End
    if (res?.queued > 0) toast(`Installing: ${res.queued} dependenc${res.queued === 1 ? 'y' : 'ies'} queued`, 'success')
    useLibraryStore.getState().clearSelection()
    await Promise.all([useLibraryStore.getState().fetchPackages(), useDownloadStore.getState().fetchItems()])
  } catch (err) {
    toast(`Install failed: ${err.message}`)
  }
}

/** Permanently delete archived packages from disk (force-remove). Caller confirms first. */
export async function runLibraryBulkRemoveFromArchive(items = resolveLibraryBulkPackages()) {
  const fnames = items.filter((p) => isPackageArchived(p.storageState)).map((p) => p.filename)
  if (!fnames.length) return
  // [AddOn] MultiProgress_Begin
  const packageMap = useLibraryStore.getState().packageByFilename
  try {
    await MovingProgressAddon.trackBatchOperations(
      {
        filenames: fnames,
        type: 'move',
        step: 'Deleting package from disk…',
        singleOpFn: (fn) => window.api.packages.forceRemove(fn),
        packageMap,
      },
      useMovingProgressStore.getState(),
    )
    useLibraryStore.getState().clearSelection()
    await useLibraryStore.getState().fetchPackages()
  } catch (err) {
    toast(`Delete failed: ${err.message}`)
  }
  // [AddOn] MultiProgress_End
}

/** Hide/show UI state for a set of content items. Empty selection => every flag false, `disabled`. */
export function contentBulkVisibilityState(items) {
  const hiddenCount = items.filter((c) => c.hidden).length
  const allHidden = items.length > 0 && hiddenCount === items.length
  return {
    disabled: !items.length,
    allHidden,
    allVisible: items.length > 0 && hiddenCount === 0,
    mixed: hiddenCount > 0 && hiddenCount < items.length,
    label: allHidden ? 'Show' : 'Hide',
  }
}

/** Favorite UI state for a set of content items. Empty selection => every flag false, `disabled`. */
export function contentBulkFavoriteState(items) {
  const favCount = items.filter((c) => c.favorite).length
  const allFav = items.length > 0 && favCount === items.length
  return {
    disabled: !items.length,
    allFav,
    allUnfav: items.length > 0 && favCount === 0,
    mixed: favCount > 0 && favCount < items.length,
    label: allFav ? 'Unfavorite' : 'Favorite',
  }
}

function contentBatchPayload(items) {
  return items.map((c) => ({
    id: c.id,
    packageFilename: c.packageFilename,
    internalPath: c.internalPath,
  }))
}

/** Toggle hide/show for the current content bulk selection (mixed → hide). */
export async function runContentBulkToggleVisibility(items = resolveContentBulkItems()) {
  const st = contentBulkVisibilityState(items)
  if (st.disabled) return
  const hidden = st.mixed || st.allVisible
  try {
    await window.api.contents.setHiddenBatch({ items: contentBatchPayload(items), hidden })
  } catch (err) {
    toast(`Failed: ${err.message}`)
  }
}

/** Toggle favorite for the current content bulk selection (mixed → favorite). */
export async function runContentBulkToggleFavorite(items = resolveContentBulkItems()) {
  const st = contentBulkFavoriteState(items)
  if (st.disabled) return
  const favorite = st.mixed || st.allUnfav
  try {
    await window.api.contents.setFavoriteBatch({ items: contentBatchPayload(items), favorite })
  } catch (err) {
    toast(`Failed: ${err.message}`)
  }
}
