// filepath: src/components/canvas/UmapViewport.tsx
import { OrthographicView, type OrthographicViewState, type PickingInfo } from '@deck.gl/core'
import { ScatterplotLayer } from '@deck.gl/layers'
import { DeckGL } from '@deck.gl/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCellStore } from '../../store/useCellStore'
import type { CellCluster, CellRecord, ColorByMode } from '../../types/cell'
import { getClusterColor, getGeneExpressionColor, getPseudotimeColor } from '../../utils/colorScale'

const GENES = ['Sox9', 'Neurog3', 'Ins1', 'Gcg'] as const
const COLOR_MODES = ['pseudotime', 'cluster', ...GENES] as const
const CLUSTERS: CellCluster[] = ['Ductal', 'Ngn3_low_EP', 'Ngn3_high_EP', 'Pre_endocrine', 'Beta', 'Alpha']
const CLUSTER_COLORS = Object.fromEntries(CLUSTERS.map((cluster) => [cluster, getClusterColor(cluster)])) as
  Record<CellCluster, ReturnType<typeof getClusterColor>>
const VIEW = new OrthographicView({ id: 'umap', flipY: false, controller: { inertia: 180 } })
const FADED_COLOR: [number, number, number, number] = [203, 213, 225, 45]
const DOT_RADIUS = 2.4
const getPosition = (cell: CellRecord): [number, number] => [cell.umapX, cell.umapY]

function modeLabel(mode: ColorByMode) {
  if (mode === 'pseudotime') return 'Pseudotime'
  if (mode === 'cluster') return 'Cluster'
  return mode
}

function ColorLegend({ mode, maximum }: { mode: ColorByMode; maximum: number }) {
  const gradient = [0, 0.5, 1].map((stop) => {
    const rgb = mode === 'pseudotime' ? getPseudotimeColor(stop).slice(0, 3) : getGeneExpressionColor(stop, 1)
    return `rgb(${rgb.join(', ')}) ${stop * 100}%`
  }).join(', ')

  return (
    <figure aria-label={`${modeLabel(mode)} color legend`} className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[calc(100%_-_1.5rem)] rounded-lg border border-lab-line bg-white/95 px-3 py-2 text-xs shadow-lab">
      <figcaption className="mb-1 font-medium">{modeLabel(mode)}</figcaption>
      {mode === 'cluster' ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {CLUSTERS.map((cluster) => (
            <li key={cluster} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[cluster].hex }} />
              {cluster}
            </li>
          ))}
        </ul>
      ) : (
        <div className="w-36">
          <div aria-hidden="true" className="h-1.5 rounded-full" style={{ backgroundImage: `linear-gradient(to right, ${gradient})` }} />
          <div className="mt-1 flex justify-between text-lab-muted">
            <span>0.0</span>
            <span>{maximum.toFixed(mode === 'pseudotime' ? 1 : 2)}</span>
          </div>
        </div>
      )}
    </figure>
  )
}

type HoveredCell = { cell: CellRecord; x: number; y: number }
type GeneMaxima = Record<keyof CellRecord['genes'], number>

function CellTooltip({ hover, maxima, width, height }: {
  hover: HoveredCell
  maxima: GeneMaxima
  width: number
  height: number
}) {
  const { cell, x, y } = hover
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-30 w-48 max-w-full rounded-md border border-lab-line bg-white p-2.5 text-xs tabular-nums shadow-lab"
      style={{ left: Math.max(0, Math.min(x + 12, width - 200)), top: Math.max(0, Math.min(y + 12, height - 178)) }}
    >
      <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5">
        <dt className="text-lab-muted">Cell ID</dt><dd>{cell.id}</dd>
        <dt className="text-lab-muted">Cluster</dt><dd>{cell.cluster}</dd>
        <dt className="text-lab-muted">Pseudotime</dt><dd>{cell.pseudotime.toFixed(3)}</dd>
        <dt className="text-lab-muted">|v|</dt><dd>{Math.hypot(cell.velocityU, cell.velocityV).toFixed(3)}</dd>
      </dl>
      <ul className="mt-2 space-y-0.5 border-t border-lab-line pt-1.5">
        {GENES.map((gene) => {
          const value = cell.genes[gene]
          const fraction = maxima[gene] > 0 ? value / maxima[gene] : 0
          return (
            <li key={gene} className="grid grid-cols-[3.25rem_1fr_2.25rem] items-center gap-1">
              <span>{gene}</span>
              <span aria-hidden="true" className="h-1 rounded-full bg-lab-line">
                <span className="block h-full rounded-full bg-lab-blue" style={{ width: `${fraction * 100}%` }} />
              </span>
              <span className="text-right">{value.toFixed(2)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function UmapViewport({ resetVersion }: { resetVersion: number }) {
  const cells = useCellStore((state) => state.cells)
  const colorBy = useCellStore((state) => state.colorBy)
  const setColorBy = useCellStore((state) => state.setColorBy)
  const selectedIds = useCellStore((state) => state.selectedCellIds)
  const [timeStart, timeEnd] = useCellStore((state) => state.pseudotimeRange)

  const container = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })
  const [camera, setCamera] = useState<{ version: number; state: OrthographicViewState }>()
  const [hover, setHover] = useState<HoveredCell | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const viewState: OrthographicViewState = camera?.version === resetVersion ? camera.state : {
    target: [0, 0, 0],
    zoom: Math.log2(Math.max(1, Math.min((width - 48) / 17, (height - 190) / 11))),
    minZoom: -1,
    maxZoom: 9,
  }

  const maxima = useMemo(() => {
    const result: GeneMaxima = { Sox9: 0, Neurog3: 0, Ins1: 0, Gcg: 0 }
    for (const cell of cells) {
      for (const gene of GENES) result[gene] = Math.max(result[gene], cell.genes[gene])
    }
    return result
  }, [cells])
  const maximum = colorBy === 'pseudotime' || colorBy === 'cluster' ? 1 : maxima[colorBy]

  const layers = useMemo(() => {
    const highlight = selectedIds.size > 0 || timeStart > 0 || timeEnd < 1
    const matches = (cell: CellRecord) =>
      (selectedIds.size === 0 || selectedIds.has(cell.id)) &&
      cell.pseudotime >= timeStart && cell.pseudotime <= timeEnd

    return [new ScatterplotLayer<CellRecord>({
      id: 'umap-cells',
      data: cells,
      pickable: true,
      opacity: 1,
      radiusUnits: 'pixels',
      getPosition,
      getRadius: (cell) => DOT_RADIUS * (highlight && matches(cell) ? 1.25 : 1),
      getFillColor: (cell) => {
        if (!matches(cell)) return FADED_COLOR
        if (colorBy === 'pseudotime') return getPseudotimeColor(cell.pseudotime)
        if (colorBy === 'cluster') return CLUSTER_COLORS[cell.cluster].rgb
        return getGeneExpressionColor(cell.genes[colorBy], maximum)
      },
      updateTriggers: {
        getFillColor: [colorBy, maximum, selectedIds, timeStart, timeEnd],
        getRadius: [selectedIds, timeStart, timeEnd],
      },
    })]
  }, [cells, colorBy, maximum, selectedIds, timeStart, timeEnd])

  function handleHover({ object, x, y }: PickingInfo<CellRecord>) {
    setHover(object ? { cell: object, x, y } : null)
  }

  return (
    <div ref={container} className="absolute inset-0 overflow-hidden" onPointerLeave={() => setHover(null)}>
      {width > 0 && height > 0 && (
        <DeckGL
          views={VIEW}
          viewState={viewState}
          layers={layers}
          onHover={handleHover}
          onViewStateChange={({ viewState: nextState }) => {
            setHover(null)
            setCamera({ version: resetVersion, state: nextState })
          }}
        />
      )}
      <div className="absolute right-3 top-14 z-20 flex items-center gap-2 rounded-full border border-lab-line bg-white/85 px-3 py-1 text-xs shadow-lab backdrop-blur-md">{/* taste-skill-ignore: required frosted color control */}
        <label htmlFor="umap-color-by" className="text-lab-muted">Color by</label>
        <select
          id="umap-color-by"
          className="rounded bg-transparent py-1 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-lab-muted"
          value={colorBy}
          onChange={(event) => setColorBy(event.currentTarget.value as ColorByMode)}
        >
          {COLOR_MODES.map((mode) => <option key={mode} value={mode}>{modeLabel(mode)}</option>)}
        </select>
      </div>
      <ColorLegend mode={colorBy} maximum={maximum} />
      {hover && <CellTooltip hover={hover} maxima={maxima} width={width} height={height} />}
    </div>
  )
}
