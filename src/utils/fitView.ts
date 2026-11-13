// filepath: src/utils/fitView.ts
import type { OrthographicViewState } from '@deck.gl/core'
import type { CellRecord } from '../types/cell'

export function fitView(cells: CellRecord[], width: number, height: number, spatial: boolean): OrthographicViewState {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const cell of cells) {
    const x = spatial ? cell.spatialX : cell.umapX
    const y = spatial ? cell.spatialY : cell.umapY
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const zoom = Math.log2(Math.max(1e-12, Math.min(
    Math.max(1, width - 48) / Math.max(1, maxX - minX),
    Math.max(1, height - (spatial ? 100 : 250)) / Math.max(1, maxY - minY),
  )))
  return { target: [(minX + maxX) / 2, (minY + maxY) / 2, 0], zoom, minZoom: zoom - 5, maxZoom: zoom + 8 }
}
