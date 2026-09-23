// [AddOn] Progressbar_Begin
import { useState, useCallback, useRef } from 'react'
import {
  X,
  Files,
  CheckCircle,
  Clock,
  XCircle,
  ChevronUp,
  Trash2,
  FolderSync,
  Power,
  PowerOff,
  Boxes,
} from 'lucide-react'
import { useMovingProgressStore } from '@/stores/useMovingProgressStore'
import { MovingProgressAddon } from '@/addons/movingProgressAddon'
import { formatTimeAgo, displayName as pkgDisplayName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import ResizeHandle from './ResizeHandle'
import { SectionLabel } from './SectionLabel'
import { EmptyState } from './EmptyState'
import { usePersistedPanelWidth } from '@/hooks/usePersistedPanelWidth'
import { VALUE, CLARIFY_DENSE, ASIDE_DENSE, META_DENSE } from '@/lib/typography'

function itemDisplayName(item) {
  return item.filename ? pkgDisplayName({ filename: item.filename }) : 'Unknown Package'
}

function getTypeIndicator(type) {
  switch (type) {
    case 'activate':
      return (
        <span className="flex items-center gap-1 shrink-0">
          <Power size={12} className="text-success shrink-0" />
          <span className="text-[10px] font-semibold text-success bg-success/15 px-1.5 py-0.2 rounded shrink-0">
            Enable
          </span>
        </span>
      )
    case 'disable':
      return (
        <span className="flex items-center gap-1 shrink-0">
          <PowerOff size={12} className="text-error shrink-0" />
          <span className="text-[10px] font-semibold text-error bg-error/15 px-1.5 py-0.2 rounded shrink-0">
            Disable
          </span>
        </span>
      )
    case 'archive':
      return (
        <span className="flex items-center gap-1 shrink-0">
          <Boxes size={12} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/15 px-1.5 py-0.2 rounded shrink-0">
            Archive
          </span>
        </span>
      )
    case 'move':
    default:
      return (
        <span className="flex items-center gap-1 shrink-0">
          <FolderSync size={12} className="text-accent-blue shrink-0" />
          <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue/15 px-1.5 py-0.2 rounded shrink-0">
            Move
          </span>
        </span>
      )
  }
}

const SECTION_CAP = 5

export default function MovingProgressPanel({ onClose }) {
  const { items, removeItem, clearCompleted, clearFailed } = useMovingProgressStore()

  const [panelWidth, setPanelWidth] = usePersistedPanelWidth('panel_width_moving_progress', {
    min: 200,
    max: 500,
    defaultWidth: 340,
  })
  const startWidthRef = useRef(panelWidth)
  const onResizeStart = useCallback(() => {
    startWidthRef.current = panelWidth
  }, [panelWidth])
  const onPanelResize = useCallback(
    (delta) => setPanelWidth(Math.min(500, Math.max(200, startWidthRef.current + delta))),
    [setPanelWidth],
  )

  const active = items.filter((d) => d.status === 'active')
  const queued = items.filter((d) => d.status === 'queued')
  const completed = items.filter((d) => d.status === 'completed')
  const failed = items.filter((d) => d.status === 'failed')
  const hasAny = items.length > 0
  const activeCount = MovingProgressAddon.getActiveCount(items)

  // [AddOn] MultiProgress_Begin
  const totalWeight = items.reduce((acc, item) => acc + (item.sizeBytes || 1024 * 1024), 0)
  const completedWeight = items.reduce((acc, item) => {
    const size = item.sizeBytes || 1024 * 1024
    if (item.status === 'completed') return acc + size
    if (item.status === 'active') return acc + (size * (item.progress || 0)) / 100
    return acc
  }, 0)
  const overallProgressPercent = totalWeight > 0 ? Math.min(100, Math.round((completedWeight / totalWeight) * 100)) : 0
  // [AddOn] MultiProgress_End

  return (
    <div className="flex shrink-0" style={{ width: panelWidth }}>
      <div className="flex-1 min-w-0 bg-surface border-r border-border flex flex-col h-full">
        {/* Title */}
        <div className="h-11 flex items-center justify-between px-4 border-b border-border shrink-0">
          <span className="text-[13px] font-medium text-text-primary flex items-center gap-2">
            <Files size={15} /> Moving & Activation Progress
          </span>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Status header if operations active */}
        {/* [AddOn] MultiProgress_Begin */}
        {activeCount > 0 && (
          <div className={`flex flex-col gap-1.5 px-4 py-2 border-b border-border shrink-0 ${CLARIFY_DENSE}`}>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-accent-blue shrink-0 animate-spin" />
              <span className="min-w-0 truncate">
                {active.length > 0
                  ? `${active.length} active · ${overallProgressPercent}% transferred overall`
                  : `${queued.length} queued`}
              </span>
            </div>
            <Progress
              value={overallProgressPercent}
              className="h-[3px] bg-elevated"
              indicatorClassName="progress-bar"
            />
          </div>
        )}
        {/* [AddOn] MultiProgress_End */}

        <div className="flex-1 overflow-y-auto">
          {/* Active */}
          {active.length > 0 && (
            <Section title="Active" count={active.length}>
              {active.map((item) => (
                <ActiveOperationItem key={item.id} item={item} onCancel={() => removeItem(item.id)} />
              ))}
            </Section>
          )}

          {/* Queued */}
          {queued.length > 0 && (
            <CappedSection
              title="Queued"
              count={queued.length}
              items={queued}
              renderItem={(item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-elevated transition-colors"
                >
                  {getTypeIndicator(item.type)}
                  <div className="min-w-0 flex-1">
                    <div className={`${VALUE} truncate select-text cursor-text`}>{itemDisplayName(item)}</div>
                  </div>
                </div>
              )}
            />
          )}

          {/* Failed */}
          {failed.length > 0 && (
            <Section title="Failed" count={failed.length} action={{ label: 'Clear', onClick: clearFailed }}>
              {failed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-elevated transition-colors"
                >
                  <XCircle size={12} className="text-error shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={`${VALUE} truncate select-text cursor-text`}>{itemDisplayName(item)}</div>
                    {item.error && (
                      <div className="text-xs text-error truncate select-text cursor-text">{item.error}</div>
                    )}
                  </div>
                  {getTypeIndicator(item.type)}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeItem(item.id)}
                      title="Remove"
                      className="text-text-aside hover:text-error"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <CappedSection
              title="Completed"
              count={completed.length}
              action={{ label: 'Clear', onClick: clearCompleted }}
              items={completed}
              renderItem={(item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 px-4 py-1.5 hover:bg-elevated transition-colors"
                >
                  <CheckCircle size={12} className="text-success shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className={`${VALUE} truncate select-text cursor-text`}>{itemDisplayName(item)}</div>
                  </div>
                  {getTypeIndicator(item.type)}
                  <span className={`${META_DENSE} shrink-0`}>{formatTimeAgo(item.timestamp)}</span>
                </div>
              )}
            />
          )}

          {!hasAny && (
            <EmptyState dense icon={<Files size={24} className="text-text-tertiary" />}>
              No active or recent operations
            </EmptyState>
          )}
        </div>
      </div>
      <ResizeHandle side="right" onResizeStart={onResizeStart} onResize={onPanelResize} />
    </div>
  )
}

function ActiveOperationItem({ item, onCancel }) {
  const progress = item.progress ?? 0

  return (
    <div className="group/active px-4 py-1.5 hover:bg-elevated transition-colors">
      <div className="flex items-center gap-1.5 mb-1 min-w-0">
        {getTypeIndicator(item.type)}
        <div className={`min-w-0 flex-1 ${VALUE} truncate select-text cursor-text`}>{itemDisplayName(item)}</div>
        <span className={`${META_DENSE} shrink-0`}>{progress}%</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCancel}
          title="Cancel"
          className="opacity-0 group-hover/active:opacity-100 text-text-aside hover:text-error transition-opacity shrink-0"
        >
          <XCircle size={12} />
        </Button>
      </div>
      {item.step && <div className="text-[11px] text-text-tertiary truncate mb-1">{item.step}</div>}
      <Progress value={progress} className="h-[3px] bg-elevated" indicatorClassName="progress-bar" />
    </div>
  )
}

function Section({ title, count, action, children }) {
  const actions = action ? (Array.isArray(action) ? action : [action]) : []
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 mb-1">
        <SectionLabel>{title}</SectionLabel>
        <span className={META_DENSE}>{count}</span>
        {actions.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={`${ASIDE_DENSE} hover:text-text-secondary cursor-pointer transition-colors`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function CappedSection({ title, count, action, items, renderItem }) {
  const [expanded, setExpanded] = useState(false)
  const total = items.length
  const collapsible = total > 6
  const visible = expanded || !collapsible ? items : items.slice(0, SECTION_CAP)
  const remaining = expanded ? 0 : collapsible ? total - SECTION_CAP : 0

  return (
    <Section title={title} count={count} action={action}>
      {visible.map(renderItem)}
      {!expanded && remaining >= 2 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`w-full px-2 py-1.5 ${ASIDE_DENSE} hover:bg-elevated hover:text-text-secondary cursor-pointer text-center transition-colors`}
        >
          + {remaining} more
        </button>
      )}
      {expanded && collapsible && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full py-1 flex items-center justify-center text-text-aside hover:bg-elevated hover:text-text-secondary cursor-pointer transition-colors"
        >
          <ChevronUp size={14} />
        </button>
      )}
    </Section>
  )
}
// [AddOn] Progressbar_End
