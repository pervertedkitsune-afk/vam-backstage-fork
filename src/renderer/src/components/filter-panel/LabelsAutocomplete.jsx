// [AddOn] TagAddon_Begin
// [AddOn] FolderFilter_Begin
import { useMemo, useState } from 'react'
import { Tag, Folder, ChevronDown, ChevronRight } from 'lucide-react'
import { LabelChip } from '@/components/labels/LabelChip'
import { LabelManageMenu } from '@/components/labels/LabelManageMenu'
import { useLabelRename } from '@/components/labels/useLabelRename'
import { labelColor } from '@/lib/labels'
import { META_DENSE } from '@/lib/typography'
import { stripNegationPrefix } from './chip-utils'
import { usePolarityList } from './usePolarityList'
import { useCombobox } from './useCombobox'
import { ChipRow, ComboboxField, ComboboxLabel, ComboboxPopup, ComboboxRow } from './Combobox'
import { TagAddon } from '@/addons/tagAddon'
import { NoLabelsAddon } from '@/addons/noLabelsAddon'

export function LabelsAutocomplete({
  value = [],
  onChange,
  labels = [],
  placeholder = 'Filter by label…',
  allowNegate = false,
  unlabelledCount = 0,
}) {
  const [query, setQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState({})

  const { renamingId, renameDraft, setRenameDraft, startRename, commitRename, cancelRename } = useLabelRename()
  const { items, selectedSet, add, remove, toggle, clear } = usePolarityList(value, onChange, allowNegate)
  const negateById = useMemo(() => new Map(items.map((i) => [i.value, i.negate])), [items])

  const noLabelItem = useMemo(() => NoLabelsAddon.getNoLabelItem(unlabelledCount), [unlabelledCount])

  const labelMap = useMemo(() => {
    const m = new Map()
    for (const l of labels) m.set(l.id, l)
    m.set(noLabelItem.id, noLabelItem)
    return m
  }, [labels, noLabelItem])

  const selected = useMemo(() => items.map((item) => labelMap.get(item.value)).filter(Boolean), [items, labelMap])

  const { negate: rawPendingNegate, query: matchQuery } = stripNegationPrefix(query)
  const pendingNegate = allowNegate && rawPendingNegate
  const q = (allowNegate ? matchQuery : query).trim().toLowerCase()

  const matches = useMemo(() => {
    const allCandidates = [noLabelItem, ...labels]
    const all = allCandidates.filter((l) => !selectedSet.has(l.id))
    if (!q) return all
    const prefix = []
    const rest = []
    for (const l of all) {
      const lowerName = l.name.toLowerCase()
      const lowerCat = (l.category || '').toLowerCase()
      if (lowerName.startsWith(q) || lowerCat.startsWith(q)) prefix.push(l)
      else if (lowerName.includes(q) || lowerCat.includes(q)) rest.push(l)
    }
    return [...prefix, ...rest]
  }, [labels, noLabelItem, selectedSet, q])

  // Group candidate matches into Folder Categories
  const categoryGroups = useMemo(() => TagAddon.groupLabelsByCategory(matches), [matches])

  const toggleCategory = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
  }

  const addLabel = (id, negate = false) => {
    add(id, negate)
    setQuery('')
    combobox.inputRef.current?.focus()
  }

  const addCategoryLabels = (categoryLabels, negate = false) => {
    console.debug(
      '[FolderFilter] Adding all category labels:',
      categoryLabels.map((l) => l.name),
    )
    for (const lbl of categoryLabels) {
      add(lbl.id, negate)
    }
    setQuery('')
    combobox.inputRef.current?.focus()
  }

  const combobox = useCombobox({
    matches,
    onSelect: (label) => addLabel(label.id, pendingNegate),
  })

  return (
    <div ref={combobox.containerRef} className="relative">
      {selected.length > 0 && (
        <ChipRow onClear={clear} showClear={selected.length > 1}>
          {selected.map((label) => (
            <LabelManageMenu
              key={label.id}
              label={label}
              applicationCount={(label.packageCount || 0) + (label.contentCount || 0)}
              onStartRename={() => startRename(label)}
              onDeleted={() => remove(label.id)}
            >
              <LabelChip
                label={label}
                size="sm"
                interactive
                filled
                negated={!!negateById.get(label.id)}
                onClick={allowNegate ? () => toggle(label.id) : undefined}
                onNameDoubleClick={() => startRename(label)}
                onRemove={() => remove(label.id)}
                renaming={renamingId === label.id}
                editValue={renameDraft}
                onEditChange={setRenameDraft}
                onCommit={commitRename}
                onCancel={cancelRename}
              />
            </LabelManageMenu>
          ))}
        </ChipRow>
      )}
      <ComboboxField
        icon={Tag}
        inputRef={combobox.inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          combobox.setOpen(true)
        }}
        onFocus={() => combobox.setOpen(true)}
        onKeyDown={combobox.onKeyDown}
        placeholder={placeholder}
        onClear={() => {
          setQuery('')
          combobox.setOpen(false)
        }}
      />
      {combobox.showList && (
        <ComboboxPopup listRef={combobox.listRef} maxHeight="max-h-72">
          {categoryGroups.length === 0 ? (
            <div className="p-3 text-xs text-text-tertiary text-center">No matching labels</div>
          ) : (
            categoryGroups.map(({ category, labels: groupLabels }) => {
              const isCollapsed = !!collapsedCategories[category]
              return (
                <div key={category} className="border-b border-border/40 last:border-0">
                  {/* Expandable/Collapsible & Selectable Folder Category Header */}
                  <div className="flex items-center justify-between px-2 py-1.5 bg-surface/60 hover:bg-hover text-xs font-semibold text-text-primary select-none border-y border-border/30">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-1.5 flex-1 cursor-pointer text-left"
                    >
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      <Folder size={13} className="text-accent-blue" />
                      <span>{category}</span>
                      <span className="text-[10px] text-text-tertiary font-normal px-1.5 py-0.2 bg-elevated rounded-full">
                        {groupLabels.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => addCategoryLabels(groupLabels, pendingNegate)}
                      className="text-[11px] text-accent-blue hover:underline px-1.5 py-0.5 rounded hover:bg-accent-blue/10 cursor-pointer"
                      title={`Select all labels under ${category}`}
                    >
                      Select Category
                    </button>
                  </div>

                  {/* Category Labels List */}
                  {!isCollapsed && (
                    <div className="py-0.5">
                      {groupLabels.map((label) => {
                        const total = (label.packageCount || 0) + (label.contentCount || 0)
                        return (
                          <LabelManageMenu
                            key={label.id}
                            label={label}
                            applicationCount={total}
                            onStartRename={() => startRename(label)}
                          >
                            <ComboboxRow
                              negate={pendingNegate}
                              onSelect={() => addLabel(label.id, pendingNegate)}
                              className="pl-6"
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: labelColor(label) }}
                              />
                              <ComboboxLabel negate={pendingNegate}>{label.name}</ComboboxLabel>
                              {total > 0 && <span className={`${META_DENSE} shrink-0`}>{total}</span>}
                            </ComboboxRow>
                          </LabelManageMenu>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </ComboboxPopup>
      )}
    </div>
  )
}
// [AddOn] FolderFilter_End
// [AddOn] TagAddon_End
