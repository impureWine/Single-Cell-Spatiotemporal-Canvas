// filepath: src/components/layout/LeftToolbar.tsx
import { Columns2, Lasso, Move, SquareDashedMousePointer, Wind } from 'lucide-react'
import { useCellStore } from '../../store/useCellStore'

const tools = [
  { id: 'pan', label: '漫游', Icon: Move },
  { id: 'lasso', label: '自由套索', Icon: Lasso },
  { id: 'box', label: '框选', Icon: SquareDashedMousePointer },
] as const

const buttonClass = 'grid h-10 w-10 place-items-center rounded text-lab-muted hover:bg-lab-canvas aria-pressed:bg-lab-blue/20 aria-pressed:text-lab-ink disabled:opacity-50'

export default function LeftToolbar() {
  const mode = useCellStore((state) => state.activeTool)
  const particles = useCellStore((state) => state.showVelocityParticles)
  const setActiveTool = useCellStore((state) => state.setActiveTool)
  const toggleVelocityParticles = useCellStore((state) => state.toggleVelocityParticles)

  return (
    <aside aria-label="视口工具" className="flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-lab-line bg-lab-panel py-2">
      {tools.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={buttonClass} title={label} aria-label={label} aria-pressed={mode === id} onClick={() => setActiveTool(id)}>
          <Icon size={18} aria-hidden="true" />
        </button>
      ))}
      <button type="button" className={buttonClass} title="流场粒子开关" aria-label="流场粒子开关" aria-pressed={particles} onClick={toggleVelocityParticles}>
        <Wind size={18} aria-hidden="true" />
      </button>
      <button type="button" className={buttonClass} title="分屏重置" aria-label="分屏重置" disabled>
        <Columns2 size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
