// filepath: src/components/canvas/BrushOverlay.tsx
import type { Viewport } from '@deck.gl/core'
import { useRef, useState, type PointerEvent } from 'react'
import { useCellStore } from '../../store/useCellStore'
import type { CellRecord, ToolMode } from '../../types/cell'

type Point = [number, number]
type BrushMode = Exclude<ToolMode, 'pan'>

function rectangle([x1, y1]: Point, [x2, y2]: Point): Point[] {
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
}

function contains([x, y]: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j]
    const [bx, by] = polygon[i]
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
    if (Math.abs(cross) < 1e-7 &&
        x >= Math.min(ax, bx) && x <= Math.max(ax, bx) &&
        y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true

    if ((ay > y) !== (by > y) && x < ax + (y - ay) * (bx - ax) / (by - ay)) {
      inside = !inside
    }
  }
  return inside
}

interface BrushOverlayProps {
  mode: BrushMode
  viewport: Viewport
  cells: CellRecord[]
  getPosition: (cell: CellRecord) => Point
}

export default function BrushOverlay({ mode, viewport, cells, getPosition }: BrushOverlayProps) {
  const setSelection = useCellStore((state) => state.setSelectedCellIds)
  const gesture = useRef<{ pointer: number; points: Point[] } | null>(null)
  const [outline, setOutline] = useState<Point[]>([])

  function pointAt(event: PointerEvent<SVGSVGElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect()
    return [
      Math.max(0, Math.min(viewport.width, (event.clientX - bounds.left) * viewport.width / bounds.width)),
      Math.max(0, Math.min(viewport.height, (event.clientY - bounds.top) * viewport.height / bounds.height)),
    ]
  }

  function start(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return

    const point = pointAt(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { pointer: event.pointerId, points: [point] }
    setOutline([point])
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return

    const point = pointAt(event)
    if (mode === 'box') {
      setOutline(rectangle(current.points[0], point))
      return
    }

    const last = current.points[current.points.length - 1]
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return
    current.points.push(point)
    setOutline([...current.points])
  }

  function finish(event: PointerEvent<SVGSVGElement>, commit: boolean) {
    const current = gesture.current
    if (!current || current.pointer !== event.pointerId) return

    gesture.current = null
    setOutline([])
    if (!commit) return

    const end = pointAt(event)
    const polygon = mode === 'box' ? rectangle(current.points[0], end) : [...current.points, end]
    const xs = polygon.map(([x]) => x)
    const ys = polygon.map(([, y]) => y)
    const left = Math.min(...xs)
    const right = Math.max(...xs)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    if (polygon.length < 3 || right - left < 3 || bottom - top < 3) return

    const ids = []
    for (const cell of cells) {
      const [x, y] = viewport.project(getPosition(cell)) as Point
      if (x >= left && x <= right && y >= top && y <= bottom && contains([x, y], polygon)) {
        ids.push(cell.id)
      }
    }
    setSelection(ids)
  }

  return (
    <svg
      aria-label={mode === 'lasso' ? '自由套索绘制区' : '矩形框选绘制区'}
      className="absolute inset-0 z-10 h-full w-full touch-none select-none cursor-crosshair"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
      onLostPointerCapture={(event) => finish(event, false)}
    >
      <polygon
        points={outline.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="rgba(243, 157, 160, 0.14)"
        stroke="#F39DA0"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
