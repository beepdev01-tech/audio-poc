import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useAudioEngine — core Web Audio engine for a mic channel
 * Returns controls and state for mic capture, effects, and output routing.
 */
export function useAudioEngine() {
  const ctxRef         = useRef(null)
  const sourceRef      = useRef(null)
  const gainRef        = useRef(null)
  const reverbRef      = useRef(null)
  const delayRef       = useRef(null)
  const pitchRef       = useRef(null)
  const analyserRef    = useRef(null)
  const monoMergerRef  = useRef(null)  // mono→stereo upmix
  const destinationRef = useRef(null)
  const destStreamRef  = useRef(null)  // MediaStream for recording
  const effectsChain   = useRef([])   // nodes currently in the path
  const animFrameRef   = useRef(null)

  const [isActive,   setIsActive]   = useState(false)
  const [effect,     setEffectState] = useState('none')
  const [volume,     setVolume]      = useState(0.8)
  const [level,      setLevel]       = useState(0)
  const [latency,    setLatency]     = useState(null)
  const [outputId,   setOutputId]    = useState('default')

  // ── Build reverb IR ────────────────────────────────────────────
  const buildIR = useCallback((ctx) => {
    const rate = ctx.sampleRate
    const length = rate * 2.5
    const ir = ctx.createBuffer(2, length, rate)
    for (let c = 0; c < 2; c++) {
      const data = ir.getChannelData(c)
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
      }
    }
    return ir
  }, [])

  // ── VU meter loop ───────────────────────────────────────────────
  const startMeter = useCallback((analyser) => {
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let rms = 0
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
      rms = Math.sqrt(rms / buf.length)
      setLevel(Math.min(rms * 8, 1))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  // ── Disconnect & reconnect effect chain ─────────────────────────
  const applyEffect = useCallback(async (ctx, effectName) => {
    if (!sourceRef.current) return

    // disconnect all
    sourceRef.current.disconnect()
    if (gainRef.current)     gainRef.current.disconnect()
    if (reverbRef.current)   reverbRef.current.disconnect()
    if (delayRef.current)    delayRef.current.disconnect()
    if (pitchRef.current)    pitchRef.current.disconnect()
    if (monoMergerRef.current) monoMergerRef.current.disconnect()
    if (analyserRef.current) analyserRef.current.disconnect()

    const dest = destinationRef.current || ctx.destination

    // gain → analyser
    gainRef.current = ctx.createGain()
    gainRef.current.gain.value = volume
    analyserRef.current = ctx.createAnalyser()
    analyserRef.current.fftSize = 256

    let lastNode = gainRef.current

    if (effectName === 'reverb') {
      if (!reverbRef.current) {
        reverbRef.current = ctx.createConvolver()
        reverbRef.current.buffer = buildIR(ctx)
      }
      gainRef.current.connect(reverbRef.current)
      lastNode = reverbRef.current
    } else if (effectName === 'delay') {
      if (!delayRef.current) {
        delayRef.current = ctx.createDelay(1.0)
        delayRef.current.delayTime.value = 0.3
        const feedback = ctx.createGain()
        feedback.gain.value = 0.4
        delayRef.current.connect(feedback)
        feedback.connect(delayRef.current)
      }
      gainRef.current.connect(delayRef.current)
      lastNode = delayRef.current
    } else if (effectName === 'pitch') {
      if (!pitchRef.current) {
        try {
          await ctx.audioWorklet.addModule('/pitch-shift-worklet.js')
        } catch (_) { /* already loaded */ }
        pitchRef.current = new AudioWorkletNode(ctx, 'pitch-shift-processor', {
          parameterData: { pitchFactor: 1.6 }
        })
      }
      gainRef.current.connect(pitchRef.current)
      lastNode = pitchRef.current
    }

    sourceRef.current.connect(gainRef.current)

    // ── Mono → Stereo upmix ──────────────────────────────────────
    // Mic input is mono (1ch). Web Audio routes mono only to L channel
    // by default. Split ch0 then merge into both L(0) and R(1).
    const splitter = ctx.createChannelSplitter(1)
    const merger   = ctx.createChannelMerger(2)
    lastNode.connect(splitter)
    splitter.connect(merger, 0, 0)  // mono ch0 → L
    splitter.connect(merger, 0, 1)  // mono ch0 → R
    monoMergerRef.current = merger

    merger.connect(analyserRef.current)
    analyserRef.current.connect(dest)

    // Connect to stream destination for recording
    if (!destStreamRef.current) {
      destStreamRef.current = ctx.createMediaStreamDestination()
    }
    analyserRef.current.connect(destStreamRef.current)

    startMeter(analyserRef.current)
    setEffectState(effectName)
  }, [volume, buildIR, startMeter])

  // ── Start mic ───────────────────────────────────────────────────
  const startMic = useCallback(async (deviceId) => {
    try {
      const t0 = performance.now()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,    // ← ปิด AGC เพิ่มเติม ลด processing
          sampleRate: 48000,         // ← match UMC202HD native rate (no resample)
          channelCount: 1
        }
      })
      // latencyHint 0 forces absolute minimum latency the OS can provide
      const ctx = new AudioContext({ latencyHint: 0, sampleRate: 48000 })
      ctxRef.current = ctx
      sourceRef.current = ctx.createMediaStreamSource(stream)
      const lat = Math.round((performance.now() - t0) + ctx.baseLatency * 1000)
      setLatency(lat)
      await applyEffect(ctx, 'none')
      setIsActive(true)
    } catch (e) {
      console.error('Mic error:', e)
    }
  }, [applyEffect])

  // ── Stop mic ────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    
    // Stop hardware tracks
    if (sourceRef.current && sourceRef.current.mediaStream) {
      sourceRef.current.mediaStream.getTracks().forEach(t => t.stop())
    }
    
    if (ctxRef.current) { 
      ctxRef.current.close()
      ctxRef.current = null 
    }
    
    // Clear all node refs to prevent cross-context errors on restart
    sourceRef.current = null
    gainRef.current = null
    reverbRef.current = null
    delayRef.current = null
    pitchRef.current = null
    analyserRef.current = null
    monoMergerRef.current = null
    destStreamRef.current = null

    setIsActive(false)
    setLevel(0)
    setLatency(null)
  }, [])

  // ── Volume change ───────────────────────────────────────────────
  const setVolumeCtrl = useCallback((v) => {
    setVolume(v)
    if (gainRef.current) gainRef.current.gain.value = v
  }, [])

  // ── Apply effect button press ───────────────────────────────────
  const applyEffectBtn = useCallback((effectName) => {
    if (ctxRef.current) applyEffect(ctxRef.current, effectName)
    else setEffectState(effectName)
  }, [applyEffect])

  // ── Route output to device ──────────────────────────────────────
  const setOutput = useCallback(async (deviceId) => {
    setOutputId(deviceId)
    // AudioContext output routing via setSinkId is available in Electron/Chrome 110+
    if (ctxRef.current && ctxRef.current.setSinkId) {
      try { await ctxRef.current.setSinkId(deviceId) } catch (e) { console.warn('setSinkId failed', e) }
    }
  }, [])

  // cleanup
  useEffect(() => () => stopMic(), [stopMic])

  return {
    isActive, effect, volume, level, latency, outputId,
    startMic, stopMic,
    setVolume: setVolumeCtrl,
    setEffect: applyEffectBtn,
    setOutput,
    mediaStream: destStreamRef.current?.stream
  }
}
