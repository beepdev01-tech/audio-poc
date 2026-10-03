// AudioWorklet processor for real-time pitch shifting (Chipmunk effect)
// Uses a simple phase vocoder / playback rate approach
class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitchFactor', defaultValue: 1.5, minValue: 0.25, maxValue: 4.0 }
    ]
  }

  constructor() {
    super()
    this._bufferSize = 2048
    this._buffer = new Float32Array(this._bufferSize)
    this._readPos = 0
    this._writePos = 0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!input || !input[0]) return true

    const factor = parameters.pitchFactor[0] ?? 1.5
    const inCh  = input[0]
    const outCh = output[0]

    for (let i = 0; i < inCh.length; i++) {
      this._buffer[this._writePos % this._bufferSize] = inCh[i]
      this._writePos++
    }

    for (let i = 0; i < outCh.length; i++) {
      const readIdx = Math.floor(this._readPos) % this._bufferSize
      outCh[i] = this._buffer[readIdx] || 0
      this._readPos += factor
      if (this._readPos > this._bufferSize * 4) this._readPos -= this._bufferSize * 2
    }

    return true
  }
}

registerProcessor('pitch-shift-processor', PitchShiftProcessor)
