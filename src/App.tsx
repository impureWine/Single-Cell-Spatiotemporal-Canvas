// filepath: src/App.tsx
import { useState } from 'react'
import LeftToolbar from './components/layout/LeftToolbar'
import MainWorkspace from './components/layout/MainWorkspace'
import TopHeader from './components/layout/TopHeader'

export default function App() {
  const [timelineOpen, setTimelineOpen] = useState(true)

  return (
    <div className="flex min-h-dvh flex-col">
      <TopHeader onReset={() => setTimelineOpen(true)} />
      <div className="flex flex-1">
        <LeftToolbar />
        <MainWorkspace
          timelineOpen={timelineOpen}
          onToggleTimeline={() => setTimelineOpen((open) => !open)}
        />
      </div>
    </div>
  )
}
