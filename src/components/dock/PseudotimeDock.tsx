// filepath: src/components/dock/PseudotimeDock.tsx
import { LineChart } from 'echarts/charts'
import { GridComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { useEffect, useMemo, useState } from 'react'
import { useCellStore } from '../../store/useCellStore'
import type { CellCluster, CellRecord } from '../../types/cell'

echarts.use([LineChart, GridComponent, MarkAreaComponent, TooltipComponent, CanvasRenderer])

const GENES = [
  { name: 'Sox9', color: '#95BCE5', rgb: '149, 188, 229' },
  { name: 'Neurog3', color: '#D4C5E2', rgb: '212, 197, 226' },
  { name: 'Ins1', color: '#F39DA0', rgb: '243, 157, 160' },
  { name: 'Gcg', color: '#64748B', rgb: '100, 116, 139' },
] as const
const BIN_COUNT = 40
const WINDOW = 0.18
const LAST_START = 1 - WINDOW
const SWEEP_MS = 10000

function binExpressions(cells: CellRecord[]) {
  const bins = Array.from({ length: BIN_COUNT }, () => ({
    count: 0,
    sums: { Sox9: 0, Neurog3: 0, Ins1: 0, Gcg: 0 },
  }))

  for (const cell of cells) {
    const bin = bins[Math.min(BIN_COUNT - 1, Math.floor(cell.pseudotime * BIN_COUNT))]
    bin.count++
    for (const { name } of GENES) bin.sums[name] += cell.genes[name]
  }

  return bins
}

function dominant(counts: Map<CellCluster, number>) {
  let cluster: CellCluster | undefined
  let largest = 0
  for (const [name, count] of counts) {
    if (count > largest) {
      cluster = name
      largest = count
    }
  }
  return cluster
}

function summarize(cells: CellRecord[], start: number, end: number) {
  const early = new Map<CellCluster, number>()
  const late = new Map<CellCluster, number>()
  const midpoint = (start + end) / 2
  let count = 0

  for (const cell of cells) {
    if (cell.pseudotime < start || cell.pseudotime > end) continue

    count++
    const phases = cell.pseudotime <= midpoint ? early : late
    phases.set(cell.cluster, (phases.get(cell.cluster) ?? 0) + 1)
  }

  const first = dominant(early)
  const last = dominant(late)
  return { count, phase: first && last && first !== last ? `${first} → ${last}` : first ?? last ?? '—' }
}

export default function PseudotimeDock() {
  const cells = useCellStore((state) => state.cells)
  const selected = useCellStore((state) => state.selectedCellIds)
  const [start, end] = useCellStore((state) => state.pseudotimeRange)
  const setRange = useCellStore((state) => state.setPseudotimeRange)
  const colorBy = useCellStore((state) => state.colorBy)
  const setColorBy = useCellStore((state) => state.setColorBy)
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(false)

  const cohort = useMemo(() => selected.size ? cells.filter((cell) => selected.has(cell.id)) : cells, [cells, selected])
  const bins = useMemo(() => binExpressions(cohort), [cohort])
  const summary = useMemo(() => summarize(cohort, start, end), [cohort, start, end])

  useEffect(() => {
    if (!playing) return

    const initial = useCellStore.getState().pseudotimeRange[0]
    const origin = performance.now()
    let last = -Infinity
    let request = 0

    function tick(now: number) {
      if (now - last >= 32) {
        last = now
        const position = initial + (now - origin) * LAST_START / SWEEP_MS
        const next = loop ? position % LAST_START : Math.min(position, LAST_START)
        setRange([next, Math.min(1, next + WINDOW)])
        if (!loop && next === LAST_START) {
          setPlaying(false)
          return
        }
      }
      request = requestAnimationFrame(tick)
    }

    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [loop, playing, setRange])

  function togglePlayback() {
    if (playing) {
      setPlaying(false)
      return
    }

    const resume = Math.abs(end - start - WINDOW) < 1e-6 && start < LAST_START
    const next = resume ? start : 0
    setRange([next, next + WINDOW])
    setPlaying(true)
  }

  const series = useMemo(() => GENES.map(({ name, color, rgb }) => ({
    id: name,
    name,
    type: 'line' as const,
    smooth: 0.4,
    showSymbol: false,
    lineStyle: { color, width: 2 },
    itemStyle: { color },
    areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: `rgba(${rgb}, 0.35)` },
      { offset: 1, color: `rgba(${rgb}, 0.02)` },
    ]) },
    data: bins.map((bin, index) => [(index + 0.5) / BIN_COUNT, bin.count ? bin.sums[name] / bin.count : null]),
  })), [bins])

  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { top: 10, right: 16, bottom: 24, left: 30 },
    tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => typeof value === 'number' ? value.toFixed(2) : '—' },
    xAxis: { type: 'value', min: 0, max: 1, interval: 0.2, axisTick: { show: false }, axisLabel: { color: '#64748B', formatter: (value: number) => value.toFixed(1) }, splitLine: { show: false } },
    yAxis: { type: 'value', min: 0, splitNumber: 3, axisLabel: { color: '#64748B' }, splitLine: { show: false } },
    series: [{
      ...series[0],
      markArea: {
        silent: true,
        label: { show: false },
        itemStyle: { color: 'rgba(100, 116, 139, 0.12)' },
        data: [[{ xAxis: start }, { xAxis: end }]],
      },
    }, ...series.slice(1)],
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] md:grid-cols-[340px_minmax(0,1fr)]">
      <div className="border-b border-lab-line px-4 py-3 md:border-b-0 md:border-r">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={togglePlayback} className="rounded-md bg-lab-blue/25 px-3 py-1.5 text-sm font-medium hover:bg-lab-blue/40">
            {playing ? '⏸ 暂停' : '▶ 播放时空演变'}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-lab-muted">
            <input type="checkbox" checked={loop} onChange={(event) => setLoop(event.currentTarget.checked)} className="accent-lab-muted" />
            循环
          </label>
        </div>
        <div className="mt-2 grid gap-1 text-xs">
          <label className="grid grid-cols-[3rem_minmax(0,1fr)_2rem] items-center gap-2">
            Start
            <input type="range" min={0} max={1} step={0.001} value={start} onChange={(event) => {
              setPlaying(false)
              setRange([Math.min(event.currentTarget.valueAsNumber, end), end])
            }} className="w-full accent-lab-muted" />
            <span aria-hidden="true" className="text-right">{start.toFixed(2)}</span>
          </label>
          <label className="grid grid-cols-[3rem_minmax(0,1fr)_2rem] items-center gap-2">
            End
            <input type="range" min={0} max={1} step={0.001} value={end} onChange={(event) => {
              setPlaying(false)
              setRange([start, Math.max(start, event.currentTarget.valueAsNumber)])
            }} className="w-full accent-lab-muted" />
            <span aria-hidden="true" className="text-right">{end.toFixed(2)}</span>
          </label>
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-lab-line pt-2 text-xs">
          <dt className="text-lab-muted">活跃细胞</dt><dd>{summary.count.toLocaleString('zh-CN')}</dd>
          <dt className="text-lab-muted">主导阶段</dt><dd>{summary.phase}</dd>
        </dl>
      </div>
      <div className="min-w-0 overflow-hidden px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="基因表达着色">
          <span className="mr-1 font-medium">基因表达</span>
          {GENES.map(({ name, color }) => (
            <button key={name} type="button" aria-pressed={colorBy === name} onClick={() => setColorBy(name)}
              className="inline-flex items-center gap-1.5 rounded-full border border-lab-line px-2 py-1 hover:bg-lab-canvas aria-pressed:border-lab-blue aria-pressed:bg-lab-blue/20">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {name}
            </button>
          ))}
        </div>
        <ReactEChartsCore echarts={echarts} option={option} style={{ height: 140, width: '100%' }} />
      </div>
    </div>
  )
}
