/**
 * native-audio.cjs — audify-based Native Audio passthrough
 * Runs in Electron main process (Node.js).
 * Mic → (mono→stereo upmix, volume scale) → Output
 */
'use strict'

const { RtAudio, RtAudioFormat, RtAudioStreamFlags } = require('audify')

// ── State ─────────────────────────────────────────────────────────
let rtAudio    = null
let isRunning  = false
let gainValue  = 0.8
let win        = null

const SAMPLE_RATE  = 48000
const FRAMES       = 128
const IN_CHANNELS  = 1
const OUT_CHANNELS = 2
const FORMAT       = RtAudioFormat.RTAUDIO_SINT16

// ── Helper: create fresh RtAudio instance ─────────────────────────
function makeRt() {
  return new RtAudio()
}

// ── Get device list with correct RtAudio IDs ──────────────────────
function getDevices() {
  try {
    const rt = makeRt()
    return rt.getDevices().map((d) => ({
      id:              d.id,             // ← RtAudio real device ID (e.g. 129, not array idx)
      name:            d.name,
      inputChannels:   d.inputChannels,
      outputChannels:  d.outputChannels,
      isDefaultInput:  d.isDefaultInput,
      isDefaultOutput: d.isDefaultOutput,
      sampleRates:     d.sampleRates || [],
    }))
  } catch (e) {
    console.error('[native-audio] getDevices error:', e)
    return []
  }
}

// ── Start passthrough ─────────────────────────────────────────────
function start({ inputDeviceId = -1, outputDeviceId = -1, volume = 0.8 } = {}, browserWin) {
  if (isRunning) stop()
  win       = browserWin
  gainValue = volume

  try {
    rtAudio = makeRt()

    // Use audify's own default device getters when -1 is passed
    const inDev  = inputDeviceId  >= 0 ? inputDeviceId  : rtAudio.getDefaultInputDevice()
    const outDev = outputDeviceId >= 0 ? outputDeviceId : rtAudio.getDefaultOutputDevice()

    // Validate with real device list
    const devices = rtAudio.getDevices()
    const inInfo  = devices.find(d => d.id === inDev)
    const outInfo = devices.find(d => d.id === outDev)
    const inName  = inInfo?.name  ?? `Device ${inDev}`
    const outName = outInfo?.name ?? `Device ${outDev}`

    if (!inInfo)  throw new Error(`Input device id ${inDev} not found`)
    if (!outInfo) throw new Error(`Output device id ${outDev} not found`)
    if ((inInfo.inputChannels   ?? 0) === 0) throw new Error(`"${inName}" has no input channels`)
    if ((outInfo.outputChannels ?? 0) === 0) throw new Error(`"${outName}" has no output channels`)

    console.log(`[native-audio] in=${inDev}:"${inName}" → out=${outDev}:"${outName}" frames=${FRAMES}`)

    rtAudio.openStream(
      // Output
      { deviceId: outDev, nChannels: OUT_CHANNELS, firstChannel: 0 },
      // Input
      { deviceId: inDev,  nChannels: IN_CHANNELS,  firstChannel: 0 },
      FORMAT,
      SAMPLE_RATE,
      FRAMES,
      'AudioPOC-native',
      // Callback — real-time audio thread
      // NOTE: outputBuffer and inputBuffer are Node.js Buffer objects (NOT TypedArrays)
      // Int16 = 2 bytes per sample → use readInt16LE(byteOffset) / writeInt16LE(value, byteOffset)
      (outputBuffer, inputBuffer, nFrames) => {
        let sumSq = 0
        for (let i = 0; i < nFrames; i++) {
          // Read mono input sample (2 bytes per sample)
          const raw    = inputBuffer.readInt16LE(i * 2)
          const scaled = Math.max(-32768, Math.min(32767, Math.round(raw * gainValue)))
          // Write stereo output (4 bytes per frame: L + R)
          outputBuffer.writeInt16LE(scaled, i * 4)      // Left
          outputBuffer.writeInt16LE(scaled, i * 4 + 2)  // Right
          sumSq += (scaled / 32768) ** 2
        }
        // Push RMS level to renderer (not every frame to avoid IPC flood)
        if (win && !win.isDestroyed()) {
          const rms = Math.min(Math.sqrt(sumSq / nFrames) * 6, 1)
          win.webContents.send('native-audio:level', rms)
        }
      },
      null,
      RtAudioStreamFlags.RTAUDIO_MINIMIZE_LATENCY
    )

    rtAudio.start()
    isRunning = true
    console.log('[native-audio] Stream started ✅')
    return { ok: true, inDev, outDev, framesPerBuffer: FRAMES, sampleRate: SAMPLE_RATE, inName, outName }

  } catch (e) {
    console.error('[native-audio] Start error:', e.message)
    try { if (rtAudio) { rtAudio.closeStream(); rtAudio = null } } catch (_) {}
    isRunning = false
    return { ok: false, error: e.message }
  }
}

// ── Stop ──────────────────────────────────────────────────────────
function stop() {
  try {
    if (rtAudio) {
      if (isRunning) rtAudio.stop()
      rtAudio.closeStream()
      rtAudio = null
    }
  } catch (e) {
    console.error('[native-audio] Stop error:', e.message)
  }
  isRunning = false
  console.log('[native-audio] Stopped')
}

// ── Volume (real-time safe) ───────────────────────────────────────
function setVolume(v) {
  gainValue = Math.max(0, Math.min(1, v))
}

module.exports = { start, stop, setVolume, getDevices, get isRunning() { return isRunning } }
