/**
 * Whether Archive needs a confirm dialog (dir picker and/or prune↔store choice).
 * Skip only when a single archive dir and nothing would be pruned or relocated —
 * the selected packages alone move into cold storage.
 */
export function archiveNeedsConfirmation(archiveDirs, preview) {
  if ((archiveDirs?.length ?? 0) > 1) return true
  if (!preview) return true
  const deleteCount = preview.prune?.deleteCount ?? 0
  if (deleteCount > 0 && !preview.catalogUnavailable) return true
  const storeCount = preview.store?.storeCount ?? 0
  return storeCount > 0
}

/** Install-from-archive needs a bill dialog when any package still has missing deps. */
export function installFromArchiveNeedsConfirmation(pkgs) {
  const list = Array.isArray(pkgs) ? pkgs : pkgs ? [pkgs] : []
  return list.some((p) => (p?.missingDeps || 0) > 0)
}

/**
 * Local preview, then decide. Fail open to the dialog if preview fails.
 * Hub refresh stays in the dialog — skip-gate only needs the cache.
 * @returns {{ needsConfirm: boolean, archiveDirId: number | null }}
 */
export async function prepareArchiveDecision(filenames, archiveDirs) {
  const list = Array.isArray(filenames) ? filenames.filter(Boolean) : filenames ? [filenames] : []
  const archiveDirId = archiveDirs[0]?.id ?? null
  if (!list.length || !archiveDirs?.length) {
    return { needsConfirm: true, archiveDirId }
  }
  try {
    const preview = await window.api.packages.archivePreview(list, archiveDirId)
    return {
      needsConfirm: archiveNeedsConfirmation(archiveDirs, preview),
      archiveDirId,
    }
  } catch {
    return { needsConfirm: true, archiveDirId }
  }
}
