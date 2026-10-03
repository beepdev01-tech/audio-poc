import { useEffect, useState } from 'react'

/**
 * useAudioDevices — enumerate input and output audio devices
 * Requests microphone permission first so labels are visible.
 */
export function useAudioDevices() {
  const [inputs,  setInputs]  = useState([])
  const [outputs, setOutputs] = useState([])

  useEffect(() => {
    const enumerate = async () => {
      try {
        // Need permission to get labelled devices
        await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()))
      } catch (_) {}

      const devices = await navigator.mediaDevices.enumerateDevices()
      setInputs(devices.filter(d => d.kind === 'audioinput'))
      setOutputs(devices.filter(d => d.kind === 'audiooutput'))
    }

    enumerate()
    navigator.mediaDevices.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate)
  }, [])

  return { inputs, outputs }
}
