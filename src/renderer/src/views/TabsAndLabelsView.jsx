// [AddOn] TagAddon_Begin
import { useState, useMemo } from 'react'
import { Search, Plus, Check, X, ArrowRight, Tag } from 'lucide-react'
import { toast } from '@/components/Toast'
import { useLibraryStore } from '@/stores/useLibraryStore'
import { useLabelsStore } from '@/stores/useLabelsStore'
import { TagAddon } from '@/addons/tagAddon'
import { labelColor } from '@/lib/labels'
import { LabelManageMenu } from '@/components/labels/LabelManageMenu'

export default function TabsAndLabelsView({ onNavigate }) {
  const packages = useLibraryStore((s) => s.packages)
  const labels = useLabelsStore((s) => s.labels)

  const [searchTerm, setSearchTerm] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [isCreatingLabel, setIsCreatingLabel] = useState(false)
  const [editingLabelId, setEditingLabelId] = useState(null)
  const [editingName, setEditingName] = useState('')

  // Dropdown filter selections (only items with >1 package appear in dropdown list)
  const [selectedTagDropdown, setSelectedTagDropdown] = useState('')
  const [selectedLabelDropdown, setSelectedLabelDropdown] = useState('')

  // Calculate tag counts across all packages
  const allTagCounts = useMemo(() => TagAddon.getTagCounts(packages), [packages])

  // Filter dropdown options: only ones with > 1 package assigned
  const dropdownTags = useMemo(() => TagAddon.filterDropdownTags(allTagCounts), [allTagCounts])
  const dropdownLabels = useMemo(() => TagAddon.filterDropdownLabels(labels), [labels])

  // Filtered lists according to top search bar / dropdown
  const filteredTags = useMemo(() => {
    let list = allTagCounts
    if (selectedTagDropdown) {
      list = list.filter((t) => t.tag === selectedTagDropdown)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter((t) => t.tag.includes(q))
    }
    return list
  }, [allTagCounts, selectedTagDropdown, searchTerm])

  const filteredLabels = useMemo(() => {
    let list = labels
    if (selectedLabelDropdown) {
      list = list.filter((l) => String(l.id) === selectedLabelDropdown)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter((l) => l.name.toLowerCase().includes(q))
    }
    return list
  }, [labels, selectedLabelDropdown, searchTerm])

  const handleCreateLabel = async (e) => {
    e?.preventDefault()
    const trimmed = newLabelName.trim()
    if (!trimmed) return
    try {
      await window.api.labels.create({ name: trimmed })
      toast(`Created label "${trimmed}"`, 'success')
      setNewLabelName('')
      setIsCreatingLabel(false)
    } catch (err) {
      toast(`Failed to create label: ${err.message}`, 'warning')
    }
  }

  const handleStartRename = (label) => {
    setEditingLabelId(label.id)
    setEditingName(label.name)
  }

  const handleSaveRename = async (id) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      setEditingLabelId(null)
      return
    }
    try {
      await window.api.labels.rename({ id, name: trimmed })
      toast(`Renamed label to "${trimmed}"`, 'success')
    } catch (err) {
      toast(`Failed to rename label: ${err.message}`, 'warning')
    } finally {
      setEditingLabelId(null)
    }
  }

  const handleRecolor = async (id, color) => {
    try {
      await window.api.labels.recolor({ id, color })
    } catch (err) {
      toast(`Failed to recolor label: ${err.message}`, 'warning')
    }
  }

  const handleNavigateTag = (tagName) => {
    useLibraryStore.getState().setSelectedTags([{ value: tagName, mode: 'include' }])
    onNavigate?.('library')
  }

  const handleNavigateLabel = (labelId) => {
    useLibraryStore.getState().setSelectedLabelIds([{ value: labelId, mode: 'include' }])
    onNavigate?.('library')
  }

  return (
    <div className="h-full flex flex-col bg-base text-text-primary overflow-hidden">
      {/* Header */}
      <header className="p-4 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Tag className="text-accent-blue" size={22} />
            Tabs and Labels
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage tags and label tabs for your library packages.</p>
        </div>

        {/* Toolbar & Search Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search tags or labels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-elevated border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {!isCreatingLabel ? (
            <button
              onClick={() => setIsCreatingLabel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              <Plus size={14} />
              New Label
            </button>
          ) : (
            <form onSubmit={handleCreateLabel} className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                placeholder="Label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="bg-elevated border border-accent-blue rounded-md px-2.5 py-1.5 text-xs text-text-primary focus:outline-none"
              />
              <button
                type="submit"
                className="p-1.5 bg-accent-blue text-white rounded-md hover:bg-accent-blue/90 cursor-pointer"
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingLabel(false)}
                className="p-1.5 bg-surface border border-border text-text-secondary rounded-md hover:text-text-primary cursor-pointer"
                title="Cancel"
              >
                <X size={14} />
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Section 1: Labels */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span>Labels</span>
                <span className="text-xs font-normal text-text-tertiary px-2 py-0.5 bg-surface rounded-full border border-border/50">
                  {labels.length} total
                </span>
              </h2>
              <p className="text-xs text-text-secondary">User-defined label tabs with customizable colors.</p>
            </div>

            {/* Label Filter Dropdown (items with > 1 package) */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-tertiary">Filter Label (&gt;1 pkg):</label>
              <select
                value={selectedLabelDropdown}
                onChange={(e) => setSelectedLabelDropdown(e.target.value)}
                className="bg-surface border border-border text-xs rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="">All Labels</option>
                {dropdownLabels.map((lbl) => (
                  <option key={lbl.id} value={lbl.id}>
                    {lbl.name} ({lbl.packageCount || 0})
                  </option>
                ))}
              </select>
              {selectedLabelDropdown && (
                <button
                  onClick={() => setSelectedLabelDropdown('')}
                  className="text-xs text-accent-blue hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredLabels.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-tertiary bg-surface/50 rounded-lg border border-border/40">
              No labels found. Click &quot;New Label&quot; to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredLabels.map((label) => {
                const colorHex = labelColor(label)
                const isEditing = editingLabelId === label.id
                return (
                  <LabelManageMenu
                    key={label.id}
                    label={label}
                    applicationCount={(label.packageCount || 0) + (label.contentCount || 0)}
                    onStartRename={() => handleStartRename(label)}
                  >
                    <div className="flex items-center justify-between p-3 bg-surface hover:bg-hover border border-border rounded-lg transition-all group">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        {/* Custom Color Wheel / Color Dot */}
                        <div className="relative group/color shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full inline-block border border-white/20 shadow-xs"
                            style={{ backgroundColor: colorHex }}
                          />
                          <input
                            type="color"
                            value={colorHex.startsWith('#') ? colorHex : '#ef5bed'}
                            onChange={(e) => handleRecolor(label.id, e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title="Change color wheel"
                          />
                        </div>

                        {/* Label Name */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <input
                              type="text"
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(label.id)
                                if (e.key === 'Escape') setEditingLabelId(null)
                              }}
                              className="w-full bg-elevated border border-accent-blue rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(label.id)}
                              className="text-accent-blue hover:text-white p-0.5"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingLabelId(null)}
                              className="text-text-tertiary hover:text-text-primary p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleNavigateLabel(label.id)}
                            className="text-xs font-semibold text-text-primary hover:text-accent-blue truncate text-left cursor-pointer"
                            title={`Filter Library by "${label.name}"`}
                          >
                            {label.name}
                          </button>
                        )}
                      </div>

                      {/* Package Count Badge & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] font-semibold text-text-tertiary bg-elevated px-2 py-0.5 rounded-full"
                          title={`${label.packageCount || 0} packages, ${label.contentCount || 0} contents`}
                        >
                          {label.packageCount || 0}
                        </span>

                        <button
                          onClick={() => handleNavigateLabel(label.id)}
                          className="p-1 text-text-tertiary hover:text-accent-blue transition-colors cursor-pointer"
                          title="Open in Library"
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </LabelManageMenu>
                )
              })}
            </div>
          )}
        </section>

        {/* Divider between Labels and Tags */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border-bright/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-base px-3 text-text-tertiary font-semibold">Tags</span>
          </div>
        </div>

        {/* Section 2: Tags */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span>Tags</span>
                <span className="text-xs font-normal text-text-tertiary px-2 py-0.5 bg-surface rounded-full border border-border/50">
                  {allTagCounts.length} total
                </span>
              </h2>
              <p className="text-xs text-text-secondary">Package hub tags extracted from package metadata.</p>
            </div>

            {/* Tag Filter Dropdown (items with > 1 package) */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-tertiary">Filter Tag (&gt;1 pkg):</label>
              <select
                value={selectedTagDropdown}
                onChange={(e) => setSelectedTagDropdown(e.target.value)}
                className="bg-surface border border-border text-xs rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="">All Tags</option>
                {dropdownTags.map(({ tag, count }) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
              {selectedTagDropdown && (
                <button onClick={() => setSelectedTagDropdown('')} className="text-xs text-accent-blue hover:underline">
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredTags.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-tertiary bg-surface/50 rounded-lg border border-border/40">
              No tags match the criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleNavigateTag(tag)}
                  className="flex items-center justify-between p-2.5 bg-surface hover:bg-hover border border-border/70 rounded-lg text-left transition-all duration-150 group cursor-pointer"
                >
                  <span className="text-xs font-medium text-text-primary truncate pr-2 group-hover:text-accent-blue">
                    {tag}
                  </span>
                  <span className="text-[11px] font-semibold text-text-tertiary bg-elevated px-2 py-0.5 rounded-full shrink-0 group-hover:bg-accent-blue/10 group-hover:text-accent-blue">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
// [AddOn] TagAddon_End
