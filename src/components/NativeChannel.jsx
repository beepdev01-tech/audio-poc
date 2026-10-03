import { useNativeAudio } from '../hooks/useNativeAudio'
import { VuMeter } from './VuMeter'
import { Fader } from './Fader'

/**
 * NativeChannel — Native RtAudio passthrough channel
 * Renders alongside the Web Audio mic channel for latency comparison
 */
export function NativeChannel() {
  const {
    isActive, level, volume, devices, inputId, outputId, latency, error,
    start, stop, setVolume, setInputId, setOutputId
  } = useNativeAudio()

  // PipeWire locks hw: devices exclusively.
  // Only show devices that work through PipeWire's ALSA compatibility layer.
  // The "Default ALSA Device" is the PipeWire-managed sink/source that routes
  // to whatever output is active (UMC202HD, built-in, etc.)
  const inputs  = devices.filter(d => d.inputChannels  > 0 && (d.isDefaultInput  || d.name.toLowerCase().includes('default')))
  const outputs = devices.filter(d => d.outputChannels > 0 && (d.isDefaultOutput || d.name.toLowerCase().includes('default')))

  const latencyClass = !latency ? '' : latency <= 5 ? '' : latency <= 15 ? 'is-high' : 'is-bad'

  return (
    <section
      className="channel-card fade-in"
      style={{ borderTop: '3px solid #f6c90e', gridColumn: 'span 3' }}
      aria-label="Native audio passthrough channel"
    >
      {/* Header */}
      <div className="channel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="channel-icon" style={{ background: 'linear-gradient(135deg,#f6c90e22,#f6c90e11)', fontSize: 16 }}>⚡</div>
        <div>
          <div className="channel-title">Native Passthrough <span style={{ fontSize: 10, background: '#f6c90e22', color: '#c9a800', padding: '2px 7px', borderRadius: 99, marginLeft: 6 }}>RtAudio / ALSA Direct</span></div>
          <div className="channel-subtitle">Bypasses Chromium pipeline — ultra-low latency mic monitor</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`status-badge ${isActive ? 'is-live' : ''}`}>
            {isActive ? 'LIVE' : 'IDLE'}
          </span>
          <button
            id="native-toggle-btn"
            className={`neu-btn ${isActive ? 'neu-btn--active neu-btn--danger' : 'neu-btn--success'}`}
            onClick={isActive ? stop : start}
            aria-pressed={isActive}
          >
            {isActive ? '⏹ Stop Native' : '⚡ Start Native'}
          </button>
        </div>
      </div>

      {/* Main controls row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'start' }}>

        {/* Input device */}
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>🎤 Input Device (ALSA)</span>
          <select
            id="native-input-sel"
            className="neu-select"
            value={inputId}
            onChange={e => setInputId(Number(e.target.value))}
            aria-label="Native audio input device"
          >
            <option value={-1}>Default Input</option>
            {inputs.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Output device */}
        <div>
          <span className="section-label" style={{ display: 'block', marginBottom: 6 }}>🔊 Output Device (ALSA)</span>
          <select
            id="native-output-sel"
            className="neu-select"
            value={outputId}
            onChange={e => setOutputId(Number(e.target.value))}
            aria-label="Native audio output device"
          >
            <option value={-1}>Default Output</option>
            {outputs.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="section-label">Volume</span>
          <Fader id="native-volume" label="VOL" value={volume} onChange={setVolume} color="#f6c90e" />
          <VuMeter level={level} color="linear-gradient(90deg,#f6c90e,#ff6b6b)" />
        </div>

        {/* Latency box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="latency-box" style={{ minWidth: 140 }}>
            <span className="latency-label">⚡ Native Latency</span>
            <span className={`latency-value ${latencyClass}`}>
              {latency != null ? `~${latency} ms` : '—'}
            </span>
          </div>
          <div className="latency-box" style={{ minWidth: 140 }}>
            <span className="latency-label">Buffer</span>
            <span className="latency-value" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              128 frames
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ff6b6b22', color: '#ff6b6b', fontSize: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Comparison note */}
      {isActive && (
        <div style={{ padding: '8px 14px', borderRadius: 10, background: '#f6c90e11', border: '1px solid #f6c90e33', fontSize: 12, color: 'var(--text-secondary)' }}>
          🔬 <strong>ทดสอบ:</strong> เปิด Mic channel (Web Audio) พร้อมกันเพื่อได้ยินความต่าง — Native จะเสียงล้ำหน้า Web Audio ประมาณ 15–30ms
        </div>
      )}
    </section>
  )
}
