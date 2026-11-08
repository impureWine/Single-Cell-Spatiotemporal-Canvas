// filepath: src/App.tsx
import { useState } from 'react'
import LeftToolbar, { type InteractionMode } from './components/layout/LeftToolbar'
import MainWorkspace from './components/layout/MainWorkspace'
import TopHeader from './components/layout/TopHeader'

export default function App() {
  const [mode, setMode] = useState<InteractionMode>('pan')
  const [particles, setParticles] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(true)

  function resetView() {
    setMode('pan')
    setParticles(false)
    setTimelineOpen(true)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopHeader onReset={resetView} />
      <div className="flex flex-1">
        <LeftToolbar
          mode={mode}
          particles={particles}
          onModeChange={setMode}
          onToggleParticles={() => setParticles((enabled) => !enabled)}
        />
        <MainWorkspace
          timelineOpen={timelineOpen}
          onToggleTimeline={() => setTimelineOpen((open) => !open)}
        />
      </div>
    </div>
  )
}
