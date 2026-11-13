// filepath: src/store/useCellStore.ts
import { create } from 'zustand'
import type { CellRecord, ColorByMode, ToolMode } from '../types/cell'
import { generatePancreasCells } from '../utils/mockGenerator'

interface CellState {
  cells: CellRecord[]
  selectedCellIds: Set<string>
  activeTool: ToolMode
  colorBy: ColorByMode
  pseudotimeRange: [number, number]
  showVelocityParticles: boolean
  particleSpeed: number
  particleDensity: number
  datasetName: string
  viewRevision: number
  importCells: (value: unknown, name: string) => void
  applyBookmark: (bookmark: 'bifurcation' | 'beta' | 'full') => void
  setSelectedCellIds: (ids: Iterable<string>) => void
  setActiveTool: (tool: ToolMode) => void
  setColorBy: (mode: ColorByMode) => void
  setPseudotimeRange: (range: [number, number]) => void
  toggleVelocityParticles: () => void
  setParticleSpeed: (speed: number) => void
  setParticleDensity: (density: number) => void
  resetView: () => void
}

function viewDefaults() {
  return {
    selectedCellIds: new Set<string>(),
    activeTool: 'pan' as const,
    colorBy: 'pseudotime' as const,
    pseudotimeRange: [0, 1] as [number, number],
    showVelocityParticles: false,
    particleSpeed: 1,
    particleDensity: 1000,
  }
}

export const useCellStore = create<CellState>()((set) => ({
  cells: generatePancreasCells(),
  datasetName: 'Pancreas_Endocrine_scVelo',
  viewRevision: 0,
  importCells: (value, datasetName) => {
    if (!Array.isArray(value) || value.length === 0) throw new Error('JSON 必须是非空 CellRecord 数组')
    const clusters = new Set(['Ductal', 'Ngn3_low_EP', 'Ngn3_high_EP', 'Pre_endocrine', 'Beta', 'Alpha'])
    const ids = new Set<string>()
    for (const cell of value) {
      if (!cell || typeof cell.id !== 'string' || !cell.id || ids.has(cell.id) || !clusters.has(cell.cluster)) {
        throw new Error('细胞 ID 必须唯一且非空，cluster 必须属于六个支持的亚群')
      }
      ids.add(cell.id)
      for (const key of ['spatialX', 'spatialY', 'umapX', 'umapY', 'pseudotime', 'velocityU', 'velocityV']) {
        if (typeof cell[key] !== 'number' || !Number.isFinite(cell[key])) throw new Error(`无效数值字段：${key}`)
      }
      if (cell.pseudotime < 0 || cell.pseudotime > 1) throw new Error('pseudotime 必须在 [0, 1] 内')
      for (const gene of ['Sox9', 'Neurog3', 'Ins1', 'Gcg']) {
        if (typeof cell.genes?.[gene] !== 'number' || !Number.isFinite(cell.genes[gene]) || cell.genes[gene] < 0) {
          throw new Error(`基因表达必须是非负有限数：${gene}`)
        }
      }
    }
    const cells = value.map((cell) => ({ ...cell, genes: { ...cell.genes } })) as CellRecord[]
    set((state) => ({ ...viewDefaults(), cells, datasetName, viewRevision: state.viewRevision + 1 }))
  },
  applyBookmark: (bookmark) => set((state) => ({
    ...viewDefaults(),
    viewRevision: state.viewRevision + 1,
    ...(bookmark === 'bifurcation' ? { pseudotimeRange: [0.42, 0.65] as [number, number], colorBy: 'Neurog3' as const } : {}),
    ...(bookmark === 'beta' ? { selectedCellIds: new Set(state.cells.filter((cell) => cell.cluster === 'Beta').map((cell) => cell.id)), colorBy: 'Ins1' as const } : {}),
  })),
  ...viewDefaults(),
  setSelectedCellIds: (ids) => set({ selectedCellIds: new Set(ids) }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setColorBy: (colorBy) => set({ colorBy }),
  setPseudotimeRange: ([start, end]) => {
    if (!Number.isFinite(start) || !Number.isFinite(end)) return

    const low = Math.max(0, Math.min(1, Math.min(start, end)))
    const high = Math.max(0, Math.min(1, Math.max(start, end)))
    set({ pseudotimeRange: [low, high] })
  },
  toggleVelocityParticles: () => set((state) => ({
    showVelocityParticles: !state.showVelocityParticles,
  })),
  setParticleSpeed: (speed) => {
    if (Number.isFinite(speed)) set({ particleSpeed: Math.max(0, speed) })
  },
  setParticleDensity: (density) => {
    if (Number.isFinite(density)) {
      set({ particleDensity: Math.max(100, Math.min(1000, Math.round(density / 50) * 50)) })
    }
  },
  resetView: () => set((state) => ({ ...viewDefaults(), viewRevision: state.viewRevision + 1 })),
}))
