import { useState, useCallback } from 'react'
import { useAudioDevices } from './hooks/useAudioDevices'
import { MicChannel } from './components/MicChannel'
import { VideoChannel } from './components/VideoChannel'
import { DeviceBar } from './components/DeviceBar'
import { RecorderBar } from './components/RecorderBar'

export default function App() {
  const { inputs } = useAudioDevices()
  
  const [micStream, setMicStream] = useState(null)
  const [video1Stream, setVideo1Stream] = useState(null)

  const handleMicStream = useCallback((s) => setMicStream(s), [])
  const handleVideo1Stream = useCallback((s) => setVideo1Stream(s), [])

  return (
    <div className="app-shell">
      {/* Drag-region titlebar */}
      <div className="titlebar">
        <div className="titlebar-logo" />
        <span className="titlebar-title">AudioPOC &mdash; Audio Mixer &amp; Effects</span>
      </div>

      {/* Main 3-column mixer grid */}
      <div className="main-layout">
        {/* Col 1: Microphone */}
        <MicChannel inputs={inputs} onStream={handleMicStream} />

        {/* Col 2: Video Player 1 */}
        <VideoChannel
          channelId="1"
          channelClass="channel-card--video1"
          accentColor="var(--accent-video1)"
          onStream={handleVideo1Stream}
        />

        {/* Col 3: Video Player 2 */}
        <VideoChannel
          channelId="2"
          channelClass="channel-card--video2"
          accentColor="var(--accent-video2)"
        />

        {/* Row 2: Recorder Bar */}
        <div style={{ gridColumn: '1 / -1' }}>
          <RecorderBar micStream={micStream} videoStream={video1Stream} />
        </div>

        {/* Bottom: Device Info Bar */}
        <DeviceBar />
      </div>
    </div>
  )
}
