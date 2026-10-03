import { useRef, useEffect } from 'react'
import { useVideoPlayer } from '../hooks/useVideoPlayer'
import { useAudioDevices } from '../hooks/useAudioDevices'
import { VuMeter } from './VuMeter'
import { Fader } from './Fader'
import { OutputSelector } from './OutputSelector'

/** Format seconds → mm:ss */
const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/**
 * VideoChannel — Local video player with Web Audio routing
 * Props: channelId ('1' | '2'), accentVar (CSS var name)
 */
export function VideoChannel({ channelId, accentColor, channelClass, onStream }) {
  const videoRef = useRef(null)
  const { outputs } = useAudioDevices()

  const {
    filePath, fileName, isPlaying, volume, level, currentTime, duration, outputId,
    openFile, togglePlay, seek, setVolume, setOutput, mediaStream
  } = useVideoPlayer(videoRef)

  useEffect(() => {
    if (onStream) onStream(mediaStream)
  }, [mediaStream, onStream])

  const channelNum = channelId

  return (
    <section
      className={`channel-card ${channelClass} fade-in`}
      aria-label={`Video Channel ${channelNum}`}
    >
      {/* Header */}
      <div className="channel-header">
        <div className={`channel-icon channel-icon--${channelClass.replace('channel-card--', '')}`}>
          {channelNum === '1' ? '🎬' : '📽️'}
        </div>
        <div>
          <div className="channel-title">Video {channelNum}</div>
          <div className="channel-subtitle" title={fileName}>
            {fileName || 'No file loaded'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className={`status-badge ${isPlaying ? 'is-playing' : ''}`}>
            {isPlaying ? 'PLAY' : 'STOP'}
          </span>
        </div>
      </div>

      {/* Video preview */}
      <div
        className="video-wrap"
        onClick={filePath ? togglePlay : openFile}
        role="button"
        aria-label={filePath ? (isPlaying ? 'Pause video' : 'Play video') : 'Open video file'}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && (filePath ? togglePlay() : openFile())}
      >
        <video
          ref={videoRef}
          style={{ display: filePath ? 'block' : 'none' }}
          aria-label={`Video ${channelNum} player`}
        />
        {!filePath && (
          <div className="video-placeholder">
            <div className="video-placeholder-icon">📂</div>
            <div className="video-placeholder-text">Click to Open Video</div>
            <div className="video-placeholder-sub">mp4, mkv, webm, mov, avi...</div>
          </div>
        )}
      </div>

      {/* VU Meter */}
      <VuMeter level={level} color={accentColor} />

      {/* Transport controls */}
      <div className="transport">
        <button
          id={`video${channelNum}-open-btn`}
          className="neu-btn neu-btn--sm"
          onClick={openFile}
          data-tip="Open video file"
          aria-label="Open file"
        >
          📂
        </button>
        <button
          id={`video${channelNum}-play-btn`}
          className={`neu-btn neu-btn--icon ${isPlaying ? 'neu-btn--active' : ''}`}
          onClick={togglePlay}
          disabled={!filePath}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          data-tip={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <span className="transport__time">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
      </div>

      {/* Seek bar */}
      <div className="fader-wrap">
        <span className="fader-label" style={{ width: 'auto' }}>⏩</span>
        <input
          id={`video${channelNum}-seek`}
          type="range"
          min="0"
          max={duration || 0}
          step="0.5"
          value={currentTime}
          onChange={e => seek(parseFloat(e.target.value))}
          disabled={!filePath}
          aria-label={`Video ${channelNum} seek`}
          style={{ accentColor }}
        />
      </div>

      {/* Volume */}
      <Fader
        id={`video${channelNum}-volume`}
        label="VOL"
        value={volume}
        onChange={setVolume}
        color={accentColor}
      />

      {/* Output selector */}
      <OutputSelector
        id={`video${channelNum}-output-sel`}
        outputs={outputs}
        value={outputId}
        onChange={setOutput}
      />
    </section>
  )
}
