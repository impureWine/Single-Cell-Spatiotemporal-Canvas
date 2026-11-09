// filepath: src/components/canvas/SpatialViewport.tsx
import { OrthographicView, type OrthographicViewState } from '@deck.gl/core'
import { ScatterplotLayer } from '@deck.gl/layers'
import { DeckGL } from '@deck.gl/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCellStore } from '../../store/useCellStore'
import type { CellCluster, CellRecord } from '../../types/cell'
import { getClusterColor, getGeneExpressionColor } from '../../utils/colorScale'
import BrushOverlay from './BrushOverlay'

const PAN_VIEW = new OrthographicView({ id: 'spatial', flipY: false, controller: { inertia: 180 } })
const BRUSH_VIEW = PAN_VIEW.clone({ controller: false })
const FADED: [number, number, number, number] = [203, 213, 225, 45]
const CLUSTERS: CellCluster[] = ['Ductal', 'Ngn3_low_EP', 'Ngn3_high_EP', 'Pre_endocrine', 'Beta', 'Alpha']
const COLORS = new Map(CLUSTERS.map((cluster) => [cluster, getClusterColor(cluster)]))
const MICRONS_PER_UNIT = 50
const getPosition = (cell: CellRecord): [number, number] => [cell.spatialX, cell.spatialY]
const OUTLINES = [[8, 5.6], [3.1, 2.8]].map(([rx, ry], index) =>
  Array.from({ length: 96 }, (_, i): [number, number] => {
    const angle = 2 * Math.PI * i / 96
    const rim = index === 0 ? 1 + 0.09 * Math.cos(3 * angle) + 0.05 * Math.sin(5 * angle) : 1
    return [rx * rim * Math.cos(angle), ry * rim * Math.sin(angle)]
  }),
)

function ProbeCard({ cells, selected }: { cells: CellRecord[]; selected: Set<string> }) {
  const clear = useCellStore((state) => state.setSelectedCellIds)
  const stats = useMemo(() => {
    const counts = new Map<CellCluster, number>()
    let count = 0
    let time = 0
    for (const cell of cells) {
      if (!selected.has(cell.id)) continue

      count++
      time += cell.pseudotime
      counts.set(cell.cluster, (counts.get(cell.cluster) ?? 0) + 1)
    }

    return { count, time, composition: [...counts].sort((a, b) => b[1] - a[1]) }
  }, [cells, selected])

  if (stats.count === 0) return null

  return (
    <aside aria-label="Microenvironment Probe" className="absolute right-3 top-14 z-20 w-64 max-w-[calc(100%_-_1.5rem)] rounded-lg border border-lab-line bg-white p-3 text-xs shadow-lab">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Microenvironment Probe</h3>
        <button type="button" className="rounded px-2 py-1 text-lab-muted hover:bg-lab-canvas" onClick={() => clear([])}>Clear</button>
      </div>
      <p className="mt-1">
        <strong className="text-sm">{stats.count.toLocaleString('zh-CN')}</strong>
        <span className="ml-2 text-lab-muted">选中 · {(100 * stats.count / cells.length).toFixed(1)}%</span>
      </p>
      <div aria-hidden="true" className="mt-2 flex h-2 overflow-hidden rounded-full bg-lab-line">
        {stats.composition.map(([cluster, count]) => (
          <span key={cluster} style={{ width: `${100 * count / stats.count}%`, backgroundColor: COLORS.get(cluster)!.hex }} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
        {stats.composition.map(([cluster, count]) => (
          <li key={cluster} className="flex min-w-0 items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS.get(cluster)!.hex }} />
            <span className="truncate" title={cluster}>{cluster}</span>
            <span className="ml-auto text-lab-muted">{(100 * count / stats.count).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 flex justify-between border-t border-lab-line pt-2">
        <dt className="text-lab-muted">Mean Pseudotime</dt>
        <dd>{(stats.time / stats.count).toFixed(3)}</dd>
      </dl>
    </aside>
  )
}

export default function SpatialViewport({ resetVersion }: { resetVersion: number }) {
  const cells = useCellStore((state) => state.cells)
  const selected = useCellStore((state) => state.selectedCellIds)
  const activeTool = useCellStore((state) => state.activeTool)
  const colorBy = useCellStore((state) => state.colorBy)
  const [start, end] = useCellStore((state) => state.pseudotimeRange)
  const container = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })
  const [camera, setCamera] = useState<{ version: number; state: OrthographicViewState }>()
  const view = activeTool === 'pan' ? PAN_VIEW : BRUSH_VIEW
  const viewState: OrthographicViewState = camera?.version === resetVersion ? camera.state : {
    target: [0, 0, 0],
    zoom: Math.log2(Math.max(1, Math.min((width - 44) / 19, (height - 90) / 13))),
    minZoom: -1,
    maxZoom: 9,
  }
  const viewport = view.makeViewport({ width, height, viewState })

  useEffect(() => {
    const element = container.current
    if (!element) return

    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const gene = colorBy === 'cluster' || colorBy === 'pseudotime' ? null : colorBy
  const maximum = useMemo(() => gene ? cells.reduce((max, cell) => Math.max(max, cell.genes[gene]), 0) : 0, [cells, gene])

  const layers = useMemo(() => {
    const highlight = selected.size > 0 || start > 0 || end < 1
    const matches = (cell: CellRecord) =>
      (selected.size === 0 || selected.has(cell.id)) && cell.pseudotime >= start && cell.pseudotime <= end

    return [new ScatterplotLayer<CellRecord>({
      id: 'spatial-cells',
      data: cells,
      opacity: 1,
      radiusUnits: 'pixels',
      getPosition,
      getRadius: (cell) => highlight && matches(cell) ? 2.75 : 2.2,
      getFillColor: (cell) => {
        if (!matches(cell)) return FADED
        return gene ? getGeneExpressionColor(cell.genes[gene], maximum) : COLORS.get(cell.cluster)!.rgb
      },
      updateTriggers: {
        getRadius: [selected, start, end],
        getFillColor: [selected, start, end, gene, maximum],
      },
    })]
  }, [cells, end, gene, maximum, selected, start])

  const pixelsPerUnit = viewport ? Math.abs(viewport.project([1, 0])[0] - viewport.project([0, 0])[0]) : 0
  const microns = [100, 50, 20, 10, 5, 2, 1].find((value) => value / MICRONS_PER_UNIT * pixelsPerUnit <= width / 3) ?? 1

  return (
    <div ref={container} className="absolute inset-0 overflow-hidden">
      {viewport && (
        <>
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`}>
            {OUTLINES.map((ring, index) => (
              <polygon key={index} points={ring.map((point) => viewport.project(point).join(',')).join(' ')} fill={index === 0 ? '#95BCE50D' : '#F39DA012'} stroke={index === 0 ? '#CBD5E1' : '#E7CBD0'} strokeWidth={1} />
            ))}
          </svg>
          <DeckGL
            width={width}
            height={height}
            views={view}
            viewState={viewState}
            layers={layers}
            onViewStateChange={({ viewState: state }) => setCamera({ version: resetVersion, state })}
          />
          {activeTool !== 'pan' && (
            <BrushOverlay key={`${activeTool}-${resetVersion}-${width}-${height}`} mode={activeTool} viewport={viewport} cells={cells} getPosition={getPosition} />
          )}
          <div title="模拟比例尺：1 空间坐标单位 = 50 μm" className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md border border-lab-line bg-white/95 px-2.5 py-1.5 text-xs text-lab-muted">
            <div className="mb-1 h-1.5 border-x border-b border-lab-muted" style={{ width: microns / MICRONS_PER_UNIT * pixelsPerUnit }} />
            Scale Bar: {microns} μm
          </div>
        </>
      )}
      <ProbeCard cells={cells} selected={selected} />
    </div>
  )
}
