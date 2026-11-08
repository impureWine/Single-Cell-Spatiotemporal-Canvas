// filepath: src/types/cell.ts
export type CellCluster =
  | 'Ductal'
  | 'Ngn3_low_EP'
  | 'Ngn3_high_EP'
  | 'Pre_endocrine'
  | 'Beta'
  | 'Alpha'

export type ToolMode = 'pan' | 'lasso' | 'box'
export type ColorByMode = 'pseudotime' | 'cluster' | 'Sox9' | 'Neurog3' | 'Ins1' | 'Gcg'

export interface CellRecord {
  id: string
  cluster: CellCluster
  spatialX: number
  spatialY: number
  umapX: number
  umapY: number
  pseudotime: number
  velocityU: number
  velocityV: number
  genes: {
    Sox9: number
    Neurog3: number
    Ins1: number
    Gcg: number
  }
}
