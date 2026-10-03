import { useEffect } from 'react'
import { useAudioEngine } from '../hooks/useAudioEngine'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { VuMeter } from './VuMeter'
import { Fader } from './Fader'
import { OutputSelector } from './OutputSelector'

const EFFECTS = [
  { id: 'none',   label: '✕ Dry',    tip: 'No effect' },
  { id: 'reverb', label: '🌊 Reverb', tip: 'Room reverb' },
  { id: 'delay',  label: '🔁 Delay',  tip: '300ms delay with feedback' },
  { id: 'pitch',  label: '🐿 Chipmunk', tip: 'Pitch up x1.6' },
]

export function MicChannel({ inputs = [], onStream }) {
  const { inputs: _i, outputs } = useAudioDevices()
  const {
    isActive, effect, volume, level, latency, outputId,
    startMic, stopMic, setVolume, setEffect, setOutput, mediaStream
  } = useAudioEngine()

  useEffect(() => {
    if (onStream) onStream(mediaStream)
  }, [mediaStream, onStream])

  const latencyClass = !latency ? '' : latency < 30 ? '' : latency < 80 ? 'is-high' : 'is-bad'

  return (
    <section className="channel-card channel-card--mic fade-in" aria-label="Microphone channel">
      {/* Header */}
      <div className="channel-header">
        <div className="channel-icon channel-icon--mic">🎙️</div>
        <div>
          <div className="channel-title">Microphone</div>
          <div className="channel-subtitle">UMC202HD Input</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className={`status-badge ${isActive ? 'is-live' : ''}`}>
            {isActive ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Mic Orb / Toggle */}
      <div className="mic-visual">
        <button
          id="mic-toggle-btn"
          className={`mic-orb ${isActive ? 'is-active' : ''}`}
          onClick={() => isActive ? stopMic() : startMic()}
          aria-pressed={isActive}
          data-tip={isActive ? 'Click to stop mic' : 'Click to start mic'}
        >
          {isActive ? '🎙️' : '🎤'}
        </button>
        <div className={`mic-status ${isActive ? 'is-active' : ''}`}>
          {isActive ? 'Recording' : 'Click to Start'}
        </div>
      </div>

      {/* VU Meter */}
      <VuMeter level={level} />

      {/* Volume */}
      <Fader
        id="mic-volume"
        label="VOL"
        value={volume}
        onChange={setVolume}
        color="var(--accent-primary)"
      />

      {/* Latency display */}
      {isActive && (
        <div className="latency-box">
          <span className="latency-label">⏱ Round-trip Latency</span>
          <span className={`latency-value ${latencyClass}`}>
            {latency != null ? `~${latency} ms` : '—'}
          </span>
        </div>
      )}

      {/* Effects */}
      <div className="scroll-area" style={{ flex: 'unset', overflow: 'visible' }}>
        <span className="section-label">🎛 Effects</span>
        <div className="effects-strip" style={{ marginTop: 8 }}>
          {EFFECTS.map(fx => (
            <button
              key={fx.id}
              id={`effect-btn-${fx.id}`}
              className={`effect-btn effect-${fx.id} ${effect === fx.id ? 'is-active' : ''}`}
              onClick={() => setEffect(fx.id)}
              data-tip={fx.tip}
              aria-pressed={effect === fx.id}
            >
              {fx.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input device selector */}
      <div className="output-select-wrap">
        <label htmlFor="mic-input-sel">🎤 IN</label>
        <select
          id="mic-input-sel"
          className="neu-select"
          onChange={e => isActive ? startMic(e.target.value) : null}
          aria-label="Microphone input device"
        >
          <option value="">Default Input</option>
          {inputs.map(d => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Output device selector */}
      <OutputSelector
        id="mic-output-sel"
        outputs={outputs}
        value={outputId}
        onChange={setOutput}
      />
    </section>
  )
}
