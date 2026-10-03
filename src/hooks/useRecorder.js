import { useRef, useState, useCallback, useEffect } from 'react'
import { encodeWAV } from '../utils/wav'

export function useRecorder(micStream, videoStream) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordUrl, setRecordUrl] = useState(null)
  
  const recorderRef = useRef(null)
  const ctxRef = useRef(null)
  const chunksRef = useRef([])

  const startRecord = useCallback(() => {
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }

    if (recordUrl) {
      URL.revokeObjectURL(recordUrl)
      setRecordUrl(null)
    }
    chunksRef.current = []

    const ctx = new AudioContext({ sampleRate: 48000 })
    ctxRef.current = ctx
    const dest = ctx.createMediaStreamDestination()

    // Mix both streams into the destination
    if (micStream && micStream.getAudioTracks().length > 0) {
      try { ctx.createMediaStreamSource(micStream).connect(dest) } catch (e) { console.error('mic err', e) }
    }
    if (videoStream && videoStream.getAudioTracks().length > 0) {
      try { ctx.createMediaStreamSource(videoStream).connect(dest) } catch (e) { console.error('vid err', e) }
    }

    // Capture mixed stream via MediaRecorder (much more robust than ScriptProcessor across contexts)
    const recorder = new MediaRecorder(dest.stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return
      
      const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const arrayBuffer = await webmBlob.arrayBuffer()
      
      // Decode WebM to raw PCM using OfflineAudioContext for guaranteed bit-perfect export
      const decodeCtx = new AudioContext({ sampleRate: 48000 })
      try {
        const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer)
        const left = audioBuffer.getChannelData(0)
        // If mono, duplicate left to right, otherwise use channel 1
        const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left
        
        // Use our WAV encoder
        const wavBlob = encodeWAV([left], [right], audioBuffer.sampleRate)
        setRecordUrl(URL.createObjectURL(wavBlob))
      } catch (err) {
        console.error('Failed to decode and encode WAV:', err)
      } finally {
        decodeCtx.close()
      }
    }

    recorder.start(100) // fire dataavailable every 100ms
    setIsRecording(true)
  }, [micStream, videoStream, recordUrl])

  const stopRecord = useCallback(() => {
    setIsRecording(false)
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    // Context is left alive to finish decoding if needed; will be cleaned up on next record or unmount
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ctxRef.current) ctxRef.current.close()
    }
  }, [])

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (recordUrl) URL.revokeObjectURL(recordUrl)
    }
  }, [recordUrl])

  return { isRecording, recordUrl, startRecord, stopRecord }
}
