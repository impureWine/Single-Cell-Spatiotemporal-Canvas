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
  setSelectedCellIds: (ids: Iterable<string>) => void
  setActiveTool: (tool: ToolMode) => void
  setColorBy: (mode: ColorByMode) => void
  setPseudotimeRange: (range: [number, number]) => void
  toggleVelocityParticles: () => void
  setParticleSpeed: (speed: number) => void
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
  }
}

export const useCellStore = create<CellState>()((set) => ({
  cells: generatePancreasCells(),
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
  resetView: () => set(viewDefaults()),
}))
