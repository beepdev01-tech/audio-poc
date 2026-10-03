/**
 * OutputSelector — Dropdown to pick audio output device
 * Props: outputs (MediaDeviceInfo[]), value, onChange
 */
export function OutputSelector({ outputs = [], value = 'default', onChange, id }) {
  return (
    <div className="output-select-wrap">
      <label htmlFor={id || 'output-sel'}>🔊 OUT</label>
      <select
        id={id || 'output-sel'}
        className="neu-select"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        aria-label="Select audio output device"
      >
        <option value="default">System Default</option>
        {outputs.map(d => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Output ${d.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </div>
  )
}
