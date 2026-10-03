import { useAudioDevices } from '../hooks/useAudioDevices'

/**
 * DeviceBar — bottom bar showing all detected audio devices
 */
export function DeviceBar() {
  const { inputs, outputs } = useAudioDevices()

  const chips = [
    ...inputs.map(d => ({ label: d.label || 'Input', color: 'var(--accent-primary)', icon: '🎤' })),
    ...outputs.map(d => ({ label: d.label || 'Output', color: 'var(--accent-secondary)', icon: '🔊' })),
  ]

  return (
    <div className="bottom-bar" role="contentinfo" aria-label="Audio devices detected">
      <span className="bottom-bar__title">🖧 Devices</span>
      <div className="bottom-bar__devices">
        {chips.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No devices detected — allow microphone access first</span>
        )}
        {chips.map((c, i) => (
          <div key={i} className="device-chip">
            <div className="device-chip-dot" style={{ background: c.color }} />
            {c.icon} {c.label.replace(/\s*\(.*?\)\s*/g, '').trim().slice(0, 40)}
          </div>
        ))}
      </div>
    </div>
  )
}
