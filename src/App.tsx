// filepath: src/App.tsx
import { useState } from 'react'
import LeftToolbar from './components/layout/LeftToolbar'
import MainWorkspace from './components/layout/MainWorkspace'
import TopHeader from './components/layout/TopHeader'
import { useCellStore } from './store/useCellStore'

export default function App() {
  const [timelineOpen, setTimelineOpen] = useState(true)
  const umapResetVersion = useCellStore((state) => state.viewRevision)

  function resetWorkspace() {
    setTimelineOpen(true)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopHeader onReset={resetWorkspace} />
      <div className="flex flex-1">
        <LeftToolbar />
        <MainWorkspace
          timelineOpen={timelineOpen}
          umapResetVersion={umapResetVersion}
          onToggleTimeline={() => setTimelineOpen((open) => !open)}
        />
      </div>
    </div>
  )
}
