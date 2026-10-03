import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useVideoPlayer — manages a <video> element connected to Web Audio
 * Supports: file loading, play/pause, seek, volume, output routing
 */
export function useVideoPlayer(videoRef) {
  const ctxRef           = useRef(null)
  const sourceRef        = useRef(null)
  const gainRef          = useRef(null)
  const analyserRef      = useRef(null)
  const destStreamRef    = useRef(null)
  const rafRef           = useRef(null)
  const pendingOutputRef = useRef('default') // holds deviceId before ctx is created

  const [filePath, setFilePath]   = useState(null)
  const [fileName, setFileName]   = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState]  = useState(0.8)
  const [level, setLevel]         = useState(0)
  const [currentTime, setCurrent] = useState(0)
  const [duration, setDuration]   = useState(0)
  const [outputId, setOutputId]   = useState('default')

  // ── Initialise Web Audio on first file load ─────────────────────
  const initAudio = useCallback(async () => {
    if (ctxRef.current || !videoRef.current) return
    const ctx = new AudioContext({ latencyHint: 'playback' })
    ctxRef.current = ctx

    // Apply any output device that was chosen before context existed
    if (pendingOutputRef.current && pendingOutputRef.current !== 'default' && ctx.setSinkId) {
      try { await ctx.setSinkId(pendingOutputRef.current) } catch (e) { console.warn('setSinkId on init:', e) }
    }

    const src = ctx.createMediaElementSource(videoRef.current)
    sourceRef.current = src
    gainRef.current = ctx.createGain()
    gainRef.current.gain.value = volume
    analyserRef.current = ctx.createAnalyser()
    analyserRef.current.fftSize = 256
    src.connect(gainRef.current)
    gainRef.current.connect(analyserRef.current)
    analyserRef.current.connect(ctx.destination)
    
    destStreamRef.current = ctx.createMediaStreamDestination()
    analyserRef.current.connect(destStreamRef.current)

    // VU meter
    const buf = new Float32Array(analyserRef.current.fftSize)
    const tick = () => {
      analyserRef.current.getFloatTimeDomainData(buf)
      let rms = 0
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
      setLevel(Math.min(Math.sqrt(rms / buf.length) * 6, 1))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [volume, videoRef])

  // ── Open file via Electron dialog ───────────────────────────────
  const openFile = useCallback(async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFile()
      if (!path) return
      const name = path.split('/').pop()
      setFilePath(`file://${path}`)
      setFileName(name)
      if (videoRef.current) {
        videoRef.current.src = `file://${path}`
        videoRef.current.load()
      }
    }
  }, [videoRef])

  // ── Play / Pause ────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    const v = videoRef.current
    if (!v || !filePath) return
    await initAudio()
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume()
    if (v.paused) { v.play(); setIsPlaying(true) }
    else           { v.pause(); setIsPlaying(false) }
  }, [videoRef, filePath, initAudio])

  // ── Seek ────────────────────────────────────────────────────────
  const seek = useCallback((time) => {
    if (videoRef.current) videoRef.current.currentTime = time
  }, [videoRef])

  // ── Volume ──────────────────────────────────────────────────────
  const setVolume = useCallback((v) => {
    setVolumeState(v)
    if (gainRef.current) gainRef.current.gain.value = v
  }, [])

  // ── Output routing ──────────────────────────────────────────────
  // NOTE: Once createMediaElementSource() is called, the <video> element
  // is silent — audio goes through the Web Audio graph.
  // setSinkId must be called on the AudioContext, NOT the video element.
  const setOutput = useCallback(async (deviceId) => {
    setOutputId(deviceId)
    pendingOutputRef.current = deviceId  // remember for when ctx is created

    const ctx = ctxRef.current
    if (ctx && ctx.setSinkId) {
      try {
        await ctx.setSinkId(deviceId === 'default' ? '' : deviceId)
      } catch (e) {
        console.warn('AudioContext.setSinkId failed:', e)
      }
    }
  }, [])

  // ── Sync time from <video> events ───────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => setCurrent(v.currentTime)
    const onDur  = () => setDuration(v.duration || 0)
    const onEnd  = () => setIsPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('durationchange', onDur)
    v.addEventListener('ended', onEnd)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('durationchange', onDur)
      v.removeEventListener('ended', onEnd)
    }
  }, [videoRef])

  // cleanup
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    ctxRef.current?.close()
  }, [])

  return {
    filePath, fileName, isPlaying, volume, level, currentTime, duration, outputId,
    openFile, togglePlay, seek, setVolume, setOutput,
    mediaStream: destStreamRef.current?.stream
  }
}
