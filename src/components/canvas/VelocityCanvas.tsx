// filepath: src/components/canvas/VelocityCanvas.tsx
import { OrthographicViewport, type OrthographicViewState } from '@deck.gl/core'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useCellStore } from '../../store/useCellStore'
import type { CellRecord } from '../../types/cell'

const GRID_SIZE = 65
const SPEEDS = [0.5, 1, 2] as const
const INKS = ['rgba(149, 188, 229, 0.78)', 'rgba(34, 34, 34, 0.55)', 'rgba(243, 157, 160, 0.78)']
const FRAME_SECONDS = 1 / 60

type GridBin = { vx: number; vy: number; t: number; count: number }
type Particle = { x: number; y: number; age: number; maxAge: number }
type Point = [number, number]

function buildField(cells: CellRecord[]) {
  if (cells.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of cells) {
    minX = Math.min(minX, cell.umapX)
    minY = Math.min(minY, cell.umapY)
    maxX = Math.max(maxX, cell.umapX)
    maxY = Math.max(maxY, cell.umapY)
  }

  const stepX = (maxX - minX || 1) / GRID_SIZE
  const stepY = (maxY - minY || 1) / GRID_SIZE
  const bins = Array.from({ length: GRID_SIZE ** 2 }, (): GridBin => ({ vx: 0, vy: 0, t: 0, count: 0 }))

  function indexAt(x: number, y: number) {
    if (x < minX || x > maxX || y < minY || y > maxY) return -1

    const column = Math.min(GRID_SIZE - 1, Math.floor((x - minX) / stepX))
    const row = Math.min(GRID_SIZE - 1, Math.floor((y - minY) / stepY))
    return row * GRID_SIZE + column
  }

  for (const cell of cells) {
    const bin = bins[indexAt(cell.umapX, cell.umapY)]
    bin.vx += cell.velocityU
    bin.vy += cell.velocityV
    bin.t += cell.pseudotime
    bin.count++
  }

  for (const bin of bins) {
    if (bin.count === 0) continue
    bin.vx /= bin.count
    bin.vy /= bin.count
    bin.t /= bin.count
  }

  return { bins, indexAt, maxStep: Math.min(stepX, stepY) * 0.45 }
}

function createProjection(viewState: OrthographicViewState, width: number, height: number) {
  const viewport = new OrthographicViewport({ ...viewState, width, height, flipY: false })
  const [offsetX, offsetY] = viewport.project([0, 0])
  const [unitX, unitY] = viewport.project([1, 1])
  const scaleX = unitX - offsetX
  const scaleY = unitY - offsetY

  return {
    worldToScreen: (x: number, y: number): Point => [offsetX + x * scaleX, offsetY + y * scaleY],
    screenToWorld: (x: number, y: number): Point => [(x - offsetX) / scaleX, (y - offsetY) / scaleY],
  }
}

function FlowControls() {
  const enabled = useCellStore((state) => state.showVelocityParticles)
  const toggle = useCellStore((state) => state.toggleVelocityParticles)
  const speed = useCellStore((state) => state.particleSpeed)
  const setSpeed = useCellStore((state) => state.setParticleSpeed)
  const density = useCellStore((state) => state.particleDensity)
  const setDensity = useCellStore((state) => state.setParticleDensity)

  return (
    <div role="group" aria-label="RNA Velocity 流场控制" className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%_-_1.5rem)] flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-lab-line bg-white/95 px-2 py-1 text-xs shadow-lab">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={toggle}
        className="h-7 rounded px-2 font-medium hover:bg-lab-canvas aria-pressed:bg-lab-blue/20"
      >
        流场
      </button>
      <select
        aria-label="流场速度"
        value={speed}
        onChange={(event) => setSpeed(Number(event.currentTarget.value))}
        className="h-7 rounded bg-transparent px-1"
      >
        {SPEEDS.map((value) => <option key={value} value={value}>{value.toFixed(1)}x</option>)}
      </select>
      <label className="flex h-7 items-center gap-1.5 text-lab-muted">
        密度
        <input
          type="range"
          aria-label="粒子密度"
          min={100}
          max={1000}
          step={50}
          value={density}
          onChange={(event) => setDensity(event.currentTarget.valueAsNumber)}
          className="w-16 accent-lab-muted"
        />
        <span className="w-7 text-right text-lab-ink">{density}</span>
      </label>
    </div>
  )
}

interface VelocityCanvasProps {
  viewState: OrthographicViewState
  width: number
  height: number
}

function VelocityCanvas({ viewState, width, height }: VelocityCanvasProps) {
  const cells = useCellStore((state) => state.cells)
  const enabled = useCellStore((state) => state.showVelocityParticles)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const field = useMemo(() => buildField(cells), [cells])
  const frameRef = useRef<{
    width: number
    height: number
    projection: ReturnType<typeof createProjection>
    visible: { left: number; right: number; bottom: number; top: number }
  }>()

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const pixelWidth = Math.max(1, Math.round(width * dpr))
    const pixelHeight = Math.max(1, Math.round(height * dpr))
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight

    const context = canvas.getContext('2d')
    context?.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0)
    // A trail belongs to the camera that drew it. Clear it before painting the new view.
    context?.clearRect(0, 0, width, height)

    const projection = createProjection(viewState, width, height)
    const [left, top] = projection.screenToWorld(-2, -2)
    const [right, bottom] = projection.screenToWorld(width + 2, height + 2)
    frameRef.current = { width, height, projection, visible: { left, right, bottom, top } }
  }, [viewState, width, height])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!enabled || !field || !context) return

    const ctx = context
    const { bins, indexAt, maxStep } = field
    const particles: Particle[] = []
    let request = 0
    let lastTime: number | undefined

    function spawn(particle: Particle, stagger: boolean) {
      // Sampling cells weights each occupied grid bin by its cell count.
      const cell = cells[Math.floor(Math.random() * cells.length)]
      particle.x = cell.umapX
      particle.y = cell.umapY
      particle.maxAge = 0.8 + Math.random() * 1.8
      particle.age = stagger ? Math.random() * particle.maxAge : 0
    }

    function tick(now: number) {
      request = requestAnimationFrame(tick)
      const frame = frameRef.current
      if (!frame) return

      const elapsed = lastTime === undefined ? FRAME_SECONDS : (now - lastTime) / 1000
      lastTime = now
      const dt = Math.min(elapsed, 0.033)
      const { particleDensity, particleSpeed } = useCellStore.getState()

      while (particles.length < particleDensity) {
        const particle = { x: 0, y: 0, age: 0, maxAge: 0 }
        spawn(particle, true)
        particles.push(particle)
      }
      particles.length = particleDensity

      ctx.globalCompositeOperation = 'destination-in'
      ctx.fillStyle = `rgba(0, 0, 0, ${0.92 ** (elapsed / FRAME_SECONDS)})`
      ctx.fillRect(0, 0, frame.width, frame.height)
      ctx.globalCompositeOperation = 'source-over'

      const strokes = INKS.map(() => new Path2D())
      const { left, right, bottom, top } = frame.visible
      for (const particle of particles) {
        const { x, y } = particle
        const bin = bins[indexAt(x, y)]
        particle.age += dt

        if (!bin?.count || particle.age >= particle.maxAge) {
          spawn(particle, false)
          continue
        }

        const displacement = dt * particleSpeed
        const step = Math.min(displacement, maxStep / (Math.max(Math.abs(bin.vx), Math.abs(bin.vy)) || 1))
        const nextX = x + bin.vx * step
        const nextY = y + bin.vy * step
        // Short steps plus both orthogonal neighbors keep diagonal trails out of dead bins.
        if (!bins[indexAt(nextX, nextY)]?.count ||
            !bins[indexAt(nextX, y)]?.count ||
            !bins[indexAt(x, nextY)]?.count) {
          spawn(particle, false)
          continue
        }

        particle.x = nextX
        particle.y = nextY
        if (Math.max(x, nextX) < left || Math.min(x, nextX) > right ||
            Math.max(y, nextY) < bottom || Math.min(y, nextY) > top) continue

        const [px, py] = frame.projection.worldToScreen(x, y)
        const [nextPx, nextPy] = frame.projection.worldToScreen(nextX, nextY)
        const ink = bin.t < 0.28 ? 0 : bin.t > 0.72 ? 2 : 1
        strokes[ink].moveTo(px, py)
        strokes[ink].lineTo(nextPx, nextPy)
      }

      ctx.lineCap = 'round'
      strokes.forEach((stroke, index) => {
        ctx.lineWidth = index === 1 ? 0.75 : 1.05
        ctx.strokeStyle = INKS[index]
        ctx.stroke(stroke)
      })
    }

    request = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(request)
      const frame = frameRef.current
      if (frame) ctx.clearRect(0, 0, frame.width, frame.height)
    }
  }, [cells, enabled, field])

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] h-full w-full" />
      <FlowControls />
    </>
  )
}

export default memo(VelocityCanvas)
