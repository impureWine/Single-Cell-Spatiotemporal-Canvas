// filepath: src/components/layout/MainWorkspace.tsx
import { ChevronDown } from 'lucide-react'
import UmapViewport from '../canvas/UmapViewport'

const viewports = [
  { id: 'viewport-a', title: 'VIEWPORT A · Spatial Tissue Slice' },
  { id: 'viewport-b', title: 'VIEWPORT B · UMAP Velocity Manifold' },
]

interface MainWorkspaceProps {
  timelineOpen: boolean
  umapResetVersion: number
  onToggleTimeline: () => void
}

export default function MainWorkspace({ timelineOpen, umapResetVersion, onToggleTimeline }: MainWorkspaceProps) {
  return (
    <main aria-label="单细胞工作区" className="flex min-w-0 flex-1 flex-col">
      <div className="grid flex-1 grid-cols-1 grid-rows-[minmax(160px,1fr)_minmax(344px,1fr)] sm:grid-cols-2 sm:grid-rows-1">
        {viewports.map(({ id, title }) => (
          <section key={id} aria-labelledby={id} className="bg-lab-grid relative isolate grid min-h-40 min-w-0 place-items-center last:border-t last:border-lab-line sm:last:min-h-[260px] sm:last:border-l sm:last:border-t-0">
            <h2 id={id} className="pointer-events-none absolute left-3 right-auto top-3 z-20 max-w-[calc(100%_-_1.5rem)] rounded-full border border-[#E2E8F0] bg-white/85 px-3 py-1.5 text-xs font-medium shadow-lab backdrop-blur-md">{/* taste-skill-ignore: required frosted viewport caption */}
              {title}
            </h2>
            {id === 'viewport-b' ? (
              <UmapViewport resetVersion={umapResetVersion} />
            ) : (
              <p className="px-3 pt-10 text-center text-xs text-lab-muted">等待视口渲染</p>
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="timeline-heading" className={`shrink-0 border-t border-lab-line bg-lab-panel ${timelineOpen ? 'h-[220px]' : ''}`}>
        <h2 id="timeline-heading">
          <button type="button" className="flex h-10 w-full items-center justify-between px-3 text-sm font-medium hover:bg-lab-canvas focus-visible:outline-offset-[-2px]" aria-expanded={timelineOpen} aria-controls="timeline-content" onClick={onToggleTimeline}>
            时序面板
            <ChevronDown size={16} className={timelineOpen ? 'rotate-180' : ''} aria-hidden="true" />
          </button>
        </h2>
        <div id="timeline-content" hidden={!timelineOpen} className="px-3 py-4 text-xs text-lab-muted">
          暂无时序数据
        </div>
      </section>
    </main>
  )
}
