// filepath: src/utils/colorScale.ts
import type { CellCluster } from '../types/cell'

type RGB = [number, number, number]
type RGBA = [number, number, number, number]

const BLUE: RGB = [149, 188, 229]
const LAVENDER: RGB = [212, 197, 226]
const PINK: RGB = [243, 157, 160]
const GRAY: RGB = [226, 232, 240]

const CLUSTER_COLORS: Record<CellCluster, RGB> = {
  Ductal: [142, 160, 175],
  Ngn3_low_EP: [147, 174, 160],
  Ngn3_high_EP: [179, 160, 192],
  Pre_endocrine: [194, 173, 143],
  Beta: [204, 147, 157],
  Alpha: [134, 167, 196],
}

function clampUnit(value: number): number {
  return Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value))
}

function mix(from: RGB, to: RGB, ratio: number): RGB {
  return [
    Math.round(from[0] + (to[0] - from[0]) * ratio),
    Math.round(from[1] + (to[1] - from[1]) * ratio),
    Math.round(from[2] + (to[2] - from[2]) * ratio),
  ]
}

function sampleScale(value: number, start: RGB, middle: RGB, end: RGB): RGB {
  const t = clampUnit(value)
  return t <= 0.5
    ? mix(start, middle, t * 2)
    : mix(middle, end, (t - 0.5) * 2)
}

export function getPseudotimeColor(t: number, alpha = 230): RGBA {
  return [...sampleScale(t, BLUE, LAVENDER, PINK), Math.round(255 * clampUnit(alpha / 255))]
}

export function getClusterColor(cluster: CellCluster): { rgb: RGB; hex: string } {
  const rgb: RGB = [...CLUSTER_COLORS[cluster]]
  const hex = '#' + rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('').toUpperCase()
  return { rgb, hex }
}

export function getGeneExpressionColor(val: number, maxVal: number): RGB {
  const fraction = Number.isFinite(maxVal) && maxVal > 0 ? val / maxVal : 0
  return sampleScale(fraction, GRAY, BLUE, PINK)
}
