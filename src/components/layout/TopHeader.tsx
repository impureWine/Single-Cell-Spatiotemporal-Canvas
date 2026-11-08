// filepath: src/components/layout/TopHeader.tsx
import { Download, RotateCcw, Workflow } from 'lucide-react'
import { useCellStore } from '../../store/useCellStore'

interface TopHeaderProps {
  onReset: () => void
}

const actionClass = 'inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs hover:bg-lab-canvas disabled:opacity-50'

export default function TopHeader({ onReset }: TopHeaderProps) {
  const totalCount = useCellStore((state) => state.cells.length)
  const selectedCount = useCellStore((state) => state.selectedCellIds.size)
  const resetView = useCellStore((state) => state.resetView)
  const metrics = [
    { label: '总细胞数', count: totalCount },
    { label: '选中细胞数', count: selectedCount },
  ]

  function handleReset() {
    resetView()
    onReset()
  }

  return (
    <header className="grid shrink-0 grid-cols-2 items-center gap-2 border-b border-lab-line bg-lab-panel px-3 py-2 lg:h-12 lg:grid-cols-[1fr_auto_1fr] lg:py-0">
      <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:col-span-1">
        <h1 className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <Workflow size={18} aria-hidden="true" />
          CellFlow Canvas
        </h1>
        <span className="rounded-full border border-lab-line bg-lab-canvas px-2 py-0.5 text-xs text-lab-muted">
          Pancreas_Endocrine_scVelo
        </span>
      </div>

      <dl className="flex w-fit divide-x divide-lab-line rounded border border-lab-line text-xs">
        {metrics.map(({ label, count }) => (
          <div key={label} className="flex flex-col gap-x-2 px-2 py-1 sm:flex-row">
            <dt className="whitespace-nowrap text-lab-muted">{label}</dt>
            <dd>{count.toLocaleString('zh-CN')}</dd>
          </div>
        ))}
      </dl>

      <div className="flex justify-end whitespace-nowrap">
        <button type="button" className={actionClass} onClick={handleReset}>
          <RotateCcw size={14} aria-hidden="true" />
          视图复位
        </button>
        <button type="button" className={actionClass} disabled title="暂无可导出的视口内容">
          <Download size={14} aria-hidden="true" />
          导出快照
        </button>
      </div>
    </header>
  )
}
