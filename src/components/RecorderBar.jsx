import React from 'react'
import { useRecorder } from '../hooks/useRecorder'

export function RecorderBar({ micStream, videoStream }) {
  const { isRecording, recordUrl, startRecord, stopRecord } = useRecorder(micStream, videoStream)

  return (
    <div className="recorder-bar" style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '1rem', background: 'var(--bg-card)', 
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-neumorphic)'
    }}>
      <div style={{ fontWeight: '600' }}>Master Recorder (WAV)</div>
      
      {!isRecording ? (
        <button className="btn" onClick={startRecord} style={{ background: '#ff4d4d', color: '#fff' }}>
          ● Record
        </button>
      ) : (
        <button className="btn" onClick={stopRecord} style={{ background: '#333', color: '#fff' }}>
          ■ Stop Recording
        </button>
      )}

      {isRecording && (
        <div style={{ color: '#ff4d4d', animation: 'pulse 1.5s infinite' }}>Recording...</div>
      )}

      {recordUrl && !isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <audio controls src={recordUrl} style={{ height: '40px' }} />
          <a href={recordUrl} download="recording.wav" className="btn" style={{ textDecoration: 'none' }}>
            💾 Save WAV
          </a>
        </div>
      )}
    </div>
  )
}
