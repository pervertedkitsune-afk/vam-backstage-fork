// [AddOn] DupeTab_Begin
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Copy,
  Trash2,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Folder,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/components/Toast'
import { formatBytes } from '@/lib/utils'
import { DUPE_TAB_COLUMNS, DupeTabRendererAddon } from '@/addons/dupeTabAddon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function DuplicatePackagesView() {
  const [duplicateGroups, setDuplicateGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('packageName')
  const [sortDirection, setSortDirection] = useState('asc')
  const [expandedKeys, setExpandedKeys] = useState({})
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [removingItem, setRemovingItem] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Column order & visibility
  const [columnsOrder, setColumnsOrder] = useState(() => DUPE_TAB_COLUMNS.map((c) => c.id))
  const [visibleColumns, setVisibleColumns] = useState(() =>
    DUPE_TAB_COLUMNS.reduce((acc, c) => ({ ...acc, [c.id]: c.defaultVisible }), {}),
  )

  const fetchDuplicates = useCallback(async () => {
    try {
      setLoading(true)
      const data = await window.api.duplicates.list()
      setDuplicateGroups(data || [])
      // Default all groups to expanded
      const initialExpanded = {}
      ;(data || []).forEach((g) => {
        initialExpanded[g.key] = true
      })
      setExpandedKeys(initialExpanded)
    } catch (err) {
      toast(`Failed to load duplicates: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDuplicates()
    const cleanup = window.api.onDuplicatesUpdated?.(() => {
      fetchDuplicates()
    })
    return () => {
      cleanup?.()
    }
  }, [fetchDuplicates])

  const toggleGroupExpand = (key) => {
    setExpandedKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const toggleColumnVisibility = (colId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }))
  }

  const moveColumn = (colId, direction) => {
    const currentIndex = columnsOrder.indexOf(colId)
    if (currentIndex === -1) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= columnsOrder.length) return
    setColumnsOrder((prev) => DupeTabRendererAddon.reorderList(prev, currentIndex, targetIndex))
  }

  const filteredGroups = useMemo(() => {
    const filtered = DupeTabRendererAddon.filterGroups(duplicateGroups, search)
    return DupeTabRendererAddon.sortGroups(filtered, sortBy, sortDirection)
  }, [duplicateGroups, search, sortBy, sortDirection])

  const totalDuplicateFiles = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + (g.count || 0), 0)
  }, [duplicateGroups])

  const totalWastedBytes = useMemo(() => {
    // Each duplicate copy after the first one is considered redundant
    return duplicateGroups.reduce((acc, g) => {
      const extraCopies = Math.max(0, (g.count || 0) - 1)
      return acc + extraCopies * (g.sizeBytes || 0)
    }, 0)
  }, [duplicateGroups])

  const handleConfirmRemove = async () => {
    if (!removingItem) return
    try {
      setIsRemoving(true)
      await window.api.duplicates.remove(removingItem.file_path)
      toast(`Removed duplicate: ${removingItem.filename}`, 'success')
      setRemovingItem(null)
      await fetchDuplicates()
    } catch (err) {
      toast(`Failed to remove duplicate: ${err.message}`, 'error')
    } finally {
      setIsRemoving(false)
    }
  }

  const renderCell = (colId, item) => {
    switch (colId) {
      case 'packageName':
        return <span className="font-medium text-text-primary">{item.package_name || item.filename}</span>
      case 'sizeBytes':
        return <span className="text-text-secondary">{formatBytes(item.size_bytes || 0)}</span>
      case 'fileDate': {
        const d = item.file_mtime ? new Date(item.file_mtime * 1000) : null
        return <span className="text-text-tertiary">{d ? d.toLocaleDateString() : '—'}</span>
      }
      case 'creator':
        return <span className="text-text-secondary">{item.creator || '—'}</span>
      case 'version':
        return <span className="text-text-secondary">{item.version ? `v${item.version}` : '—'}</span>
      case 'folder':
        return (
          <span className="text-text-tertiary text-[11px] truncate block max-w-xs" title={item.file_path}>
            {item.library_dir_path || 'Main'} {item.subpath ? `/${item.subpath}` : ''}
          </span>
        )
      case 'storageState':
        return (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
              item.storage_state === 'enabled'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : item.storage_state === 'archived'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
            }`}
          >
            {item.storage_state || 'enabled'}
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col bg-base text-text-primary overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Copy className="text-accent-blue" size={22} />
            Duplicate Packages
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Detected {duplicateGroups.length} packages ({totalDuplicateFiles} total files) with identical copies across
            your active and offloaded folders ({formatBytes(totalWastedBytes)} potential space saved).
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search duplicates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-elevated border border-border rounded-md px-2 py-1 text-xs text-text-primary">
            <ArrowUpDown size={13} className="text-text-tertiary" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="packageName">Package Name</option>
              <option value="sizeBytes">File Size</option>
              <option value="creator">Creator</option>
              <option value="count">Copies Count</option>
            </select>
            <button
              onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="ml-1 text-text-tertiary hover:text-text-primary cursor-pointer font-bold"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Column categories toggle & reorder button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs font-medium transition-colors cursor-pointer ${
                showColumnConfig
                  ? 'bg-hover border-accent-blue text-accent-blue'
                  : 'bg-elevated border-border text-text-secondary hover:text-text-primary'
              }`}
              title="Configure and rearrange column categories"
            >
              <SlidersHorizontal size={14} />
              Columns
            </button>

            {/* Column config popover */}
            {showColumnConfig && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl p-3 z-50 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border text-xs font-semibold">
                  <span>Toggle & Rearrange Columns</span>
                  <button
                    onClick={() => setShowColumnConfig(false)}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {columnsOrder.map((colId, index) => {
                    const col = DUPE_TAB_COLUMNS.find((c) => c.id === colId)
                    if (!col) return null
                    const isVisible = visibleColumns[colId]
                    return (
                      <div
                        key={colId}
                        className="flex items-center justify-between p-1.5 rounded bg-elevated/50 text-xs hover:bg-elevated"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleColumnVisibility(colId)}
                            className="text-text-tertiary hover:text-text-primary cursor-pointer"
                            title={isVisible ? 'Hide Column' : 'Show Column'}
                          >
                            {isVisible ? (
                              <Eye size={13} className="text-accent-blue" />
                            ) : (
                              <EyeOff size={13} className="text-text-aside" />
                            )}
                          </button>
                          <span className={isVisible ? 'text-text-primary' : 'text-text-aside line-through'}>
                            {col.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            disabled={index === 0}
                            onClick={() => moveColumn(colId, 'up')}
                            className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp size={12} />
                          </button>
                          <button
                            disabled={index === columnsOrder.length - 1}
                            onClick={() => moveColumn(colId, 'down')}
                            className="p-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchDuplicates}
            className="p-1.5 bg-elevated hover:bg-hover border border-border text-text-secondary hover:text-text-primary rounded-md transition-colors cursor-pointer"
            title="Refresh duplicates"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main duplicate packages listing */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && duplicateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-tertiary space-y-2">
            <RefreshCw size={24} className="animate-spin text-accent-blue" />
            <p className="text-xs">Scanning for duplicate packages...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-tertiary bg-surface/50 rounded-xl border border-border/40">
            {search ? 'No duplicates match your search query.' : 'No duplicate packages found! Everything is clean.'}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = !!expandedKeys[group.key]
            return (
              <div
                key={group.key}
                className="border border-border/70 rounded-xl overflow-hidden bg-surface/30 shadow-xs"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroupExpand(group.key)}
                  className="w-full flex items-center justify-between p-3 bg-surface hover:bg-hover border-b border-border/40 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-text-tertiary">
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </span>
                    <Folder size={16} className="text-accent-blue" />
                    <span className="font-bold text-xs text-text-primary">{group.packageName}</span>
                    <span className="text-[11px] text-text-tertiary">by {group.creator || 'Unknown'}</span>
                    {group.version && (
                      <span className="text-[10px] bg-elevated px-1.5 py-0.5 rounded text-text-secondary font-mono">
                        v{group.version}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-tertiary">{formatBytes(group.sizeBytes || 0)} each</span>
                    <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {group.count} copies
                    </span>
                  </div>
                </div>

                {/* Duplicates Table for this Group */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-elevated/40 border-b border-border/40 text-text-tertiary uppercase text-[10px] tracking-wider">
                          {columnsOrder
                            .filter((colId) => visibleColumns[colId])
                            .map((colId) => {
                              const col = DUPE_TAB_COLUMNS.find((c) => c.id === colId)
                              return (
                                <th key={colId} className="py-2 px-3 font-semibold">
                                  {col?.label}
                                </th>
                              )
                            })}
                          <th className="py-2 px-3 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {group.items?.map((item) => (
                          <tr key={item.file_path} className="hover:bg-hover/50 transition-colors">
                            {columnsOrder
                              .filter((colId) => visibleColumns[colId])
                              .map((colId) => (
                                <td key={colId} className="py-2.5 px-3">
                                  {renderCell(colId, item)}
                                </td>
                              ))}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => setRemovingItem(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                title="Remove this copy to Recycle Bin"
                              >
                                <Trash2 size={12} />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Confirmation Dialog for removing duplicate */}
      {removingItem && (
        <AlertDialog open={!!removingItem} onOpenChange={(open) => !open && setRemovingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={18} />
                Remove Duplicate Package
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-xs">
                <p>
                  Are you sure you want to remove this copy of{' '}
                  <strong className="text-text-primary">{removingItem.filename}</strong>?
                </p>
                <div className="p-2 bg-surface rounded border border-border font-mono text-[11px] text-text-tertiary break-all">
                  {removingItem.file_path}
                </div>
                <p className="text-text-secondary">
                  This file will be moved to your system Recycling Bin. Other copies in other directories will remain
                  intact.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRemoving ? 'Removing...' : 'Remove Copy'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
// [AddOn] DupeTab_End
