/**
 * VuMeter — animated level bar
 * Props: level (0–1), color (CSS variable or color string)
 */
export function VuMeter({ level = 0, color }) {
  const pct = Math.round(level * 100)
  return (
    <div className="vu-meter" aria-label={`Level ${pct}%`}>
      <div
        className="vu-meter__bar"
        style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  )
}
