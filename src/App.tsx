// filepath: src/App.tsx
import { useState } from 'react'
import LeftToolbar from './components/layout/LeftToolbar'
import MainWorkspace from './components/layout/MainWorkspace'
import TopHeader from './components/layout/TopHeader'

export default function App() {
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [umapResetVersion, setUmapResetVersion] = useState(0)

  function resetWorkspace() {
    setTimelineOpen(true)
    setUmapResetVersion((version) => version + 1)
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
