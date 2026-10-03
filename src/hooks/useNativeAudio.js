import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useNativeAudio — controls audify native audio passthrough via IPC
 * Direct RtAudio (ALSA) mic → output with minimal latency
 */
export function useNativeAudio() {
  const [isActive,  setIsActive]  = useState(false)
  const [level,     setLevel]     = useState(0)
  const [volume,    setVolumeState] = useState(0.8)
  const [devices,   setDevices]   = useState([])
  const [inputId,   setInputId]   = useState(-1)
  const [outputId,  setOutputId]  = useState(-1)
  const [latency,   setLatency]   = useState(null)
  const [error,     setError]     = useState(null)
  const unsubRef = useRef(null)

  // ── Load device list on mount ─────────────────────────────────
  useEffect(() => {
    window.electronAPI?.nativeGetDevices?.().then(setDevices)
  }, [])

  // ── Subscribe to level events from main process ───────────────
  useEffect(() => {
    if (!window.electronAPI?.onNativeLevel) return
    const unsub = window.electronAPI.onNativeLevel((rms) => setLevel(rms))
    unsubRef.current = unsub
    return () => unsub?.()
  }, [])

  // ── Start native passthrough ──────────────────────────────────
  const start = useCallback(async () => {
    setError(null)
    const t0 = performance.now()
    const result = await window.electronAPI?.nativeStart({
      inputDeviceId:  inputId,
      outputDeviceId: outputId,
      volume
    })
    if (result?.ok) {
      const lat = Math.round(performance.now() - t0)
      // Theoretical latency: 2 × (framesPerBuffer / sampleRate) × 1000
      const theoreticalMs = Math.round((result.framesPerBuffer / result.sampleRate) * 2 * 1000)
      setLatency(theoreticalMs)
      setIsActive(true)
    } else {
      setError(result?.error || 'Failed to start native audio')
    }
  }, [inputId, outputId, volume])

  // ── Stop ──────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    await window.electronAPI?.nativeStop()
    setIsActive(false)
    setLevel(0)
    setLatency(null)
  }, [])

  // ── Volume ────────────────────────────────────────────────────
  const setVolume = useCallback((v) => {
    setVolumeState(v)
    window.electronAPI?.nativeSetVolume(v)
  }, [])

  // cleanup on unmount
  useEffect(() => () => { window.electronAPI?.nativeStop() }, [])

  return {
    isActive, level, volume, devices, inputId, outputId, latency, error,
    start, stop, setVolume,
    setInputId,
    setOutputId,
  }
}
