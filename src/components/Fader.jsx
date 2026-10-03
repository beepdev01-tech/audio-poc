/**
 * Fader — Neumorphic volume slider
 * Props: label, value (0–1), onChange, color
 */
export function Fader({ label = 'VOL', value = 0.8, onChange, color, id }) {
  const pct = Math.round(value * 100)
  return (
    <div className="fader-wrap">
      <span className="fader-label">{label}</span>
      <input
        id={id || `fader-${label}`}
        type="range"
        min="0" max="1" step="0.01"
        value={value}
        onChange={e => onChange?.(parseFloat(e.target.value))}
        aria-label={`${label} volume`}
        style={color ? { accentColor: color } : {}}
      />
      <span className="fader-value">{pct}%</span>
    </div>
  )
}
