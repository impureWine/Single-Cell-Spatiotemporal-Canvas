// filepath: src/utils/mockGenerator.ts
import type { CellCluster, CellRecord } from '../types/cell'

const SEED = 0x13579bdf
const FORK_TIME = 0.625
const ISLETS = [[-1.8, 0.5], [0.9, 1.3], [1.7, -1.3], [-0.8, -1.7]] as const

function createRandom() {
  let state = SEED

  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
}

function normal(random: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function clusterAt(t: number, isBeta: boolean): CellCluster {
  if (t < 0.18) return 'Ductal'
  if (t < 0.35) return 'Ngn3_low_EP'
  if (t < 0.51) return 'Ngn3_high_EP'
  if (t < 0.72) return 'Pre_endocrine'
  return isBeta ? 'Beta' : 'Alpha'
}

export function generatePancreasCells(count = 10000): CellRecord[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 0xffffffff) {
    throw new RangeError('count must be an integer between 0 and 4294967295')
  }

  const random = createRandom()

  return Array.from({ length: count }, (_, index) => {
    const t = random()
    const isBeta = random() < 0.6
    const sign = isBeta ? 1 : -1
    const cluster = clusterAt(t, isBeta)

    const branchT = Math.max(0, (t - FORK_TIME) / (1 - FORK_TIME))
    const centerX = -8 + 16 * t
    const centerY = sign * 5 * branchT ** 2 * (2 - branchT)
    const tangentY = sign * 5 * branchT * (4 - 3 * branchT) / (1 - FORK_TIME)
    const tangentLength = Math.hypot(16, tangentY)
    const tangentU = 16 / tangentLength
    const tangentV = tangentY / tangentLength
    const spread = (0.16 + 0.22 * Math.sin(Math.PI * t)) * normal(random)
    const speed = 0.35 + 0.65 * Math.sin(Math.PI * t)

    const angle = 2 * Math.PI * random()
    const rim = 1 + 0.09 * Math.cos(3 * angle) + 0.05 * Math.sin(5 * angle)
    const islet = ISLETS[Math.floor(random() * ISLETS.length)]
    const inward = smoothstep((t - 0.18) / 0.54)
    const spatialX = (1 - inward) * 8 * rim * Math.cos(angle)
      + inward * (islet[0] + sign * 0.22) + 0.38 * normal(random)
    const spatialY = (1 - inward) * 5.6 * rim * Math.sin(angle)
      + inward * islet[1] + 0.32 * normal(random)

    const mature = smoothstep((t - 0.65) / 0.27)
    const expression = (signal: number) => Math.max(0, signal + 0.08 * normal(random))

    return {
      id: `cell-${index + 1}`,
      cluster,
      spatialX,
      spatialY,
      umapX: centerX - tangentV * spread,
      umapY: centerY + tangentU * spread,
      pseudotime: t,
      velocityU: speed * tangentU,
      velocityV: speed * tangentV,
      genes: {
        Sox9: expression(4.2 * (1 - smoothstep(t / 0.56))),
        Neurog3: expression(4.8 * Math.exp(-0.5 * ((t - 0.44) / 0.115) ** 2)),
        Ins1: expression(isBeta ? 7.5 * mature : 0),
        Gcg: expression(isBeta ? 0 : 6.5 * mature),
      },
    }
  })
}
