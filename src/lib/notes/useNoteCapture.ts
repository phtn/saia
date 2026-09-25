/**
 * Voice input for a note: dictation types speech into the body; recording
 * saves an audio clip and transcribes it at the same time when the browser can.
 */
import { useEffect, useRef, useState } from 'octane'
import { listen, speechRecognitionSupported, type SpeechSession } from '@/lib/assistant/speech'
import { putClipAudio } from './audio-db'
import { recordingSupported, startRecording, type ActiveRecording } from './recorder'
import { newId } from './store'
import type { AudioClip } from './types'

export type CaptureMode = 'idle' | 'dictating' | 'starting' | 'recording' | 'saving'

export interface NoteCaptureOptions {
  /** A finished phrase of dictation, to append to the note body. */
  onDictated: (text: string) => void
  /** A saved recording, audio already stored. */
  onClip: (clip: AudioClip) => void
}

export interface NoteCapture {
  mode: CaptureMode
  /** Words heard but not yet final, shown as a live preview. */
  partial: string
  /** Seconds recorded so far. */
  elapsed: number
  /** 0–1 input loudness while recording. */
  level: number
  error: string
  canDictate: boolean
  canRecord: boolean
  toggleDictation: () => void
  toggleRecording: () => void
  /** Stop everything, keeping a recording in progress. */
  finish: () => Promise<void>
}

export function useNoteCapture(options: NoteCaptureOptions): NoteCapture {
  const [mode, setMode] = useState<CaptureMode>('idle')
  const [partial, setPartial] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const handlers = useRef(options)
  handlers.current = options

  const session = useRef<SpeechSession | null>(null)
  // Recognition ends itself after silence; while this is set it is restarted.
  const keepListening = useRef(false)
  const recording = useRef<ActiveRecording | null>(null)
  const transcript = useRef<string[]>([])
  const ticker = useRef(0)
  // Set when the fields close or unmount while the mic is still being granted.
  const abandoned = useRef(false)

  const startListening = (purpose: 'dictation' | 'recording', onFinal: (text: string) => void) => {
    keepListening.current = true
    const begin = () => {
      session.current = listen({
        continuous: true,
        onPartial: setPartial,
        onResult: (text) => {
          setPartial('')
          if (text) onFinal(text)
        },
        onError: (message) => {
          // Silence is routine while taking notes; anything else stops listening.
          if (message === 'No speech detected.') return
          keepListening.current = false
          setPartial('')
          if (purpose === 'recording') {
            // The audio keeps recording; only the live transcript is lost.
            setError(`Transcription stopped (${message.replace(/\.$/, '')}). Audio is still recording.`)
          } else {
            setError(message)
            setMode('idle')
          }
        },
        onEnd: () => {
          if (keepListening.current) begin()
        }
      })
    }
    begin()
  }

  const stopListening = () => {
    keepListening.current = false
    session.current?.stop()
    session.current = null
    setPartial('')
  }

  const stopTicker = () => {
    window.clearInterval(ticker.current)
    setLevel(0)
  }

  const stopRecording = async () => {
    const active = recording.current
    if (!active) return
    recording.current = null
    stopTicker()
    stopListening()
    // A mid-recording transcription warning no longer applies once the clip is saved.
    setError((current) => (current.startsWith('Transcription stopped') ? 'Saved without a full transcript.' : current))
    setMode('saving')
    try {
      const { blob, duration, mimeType } = await active.stop()
      const clip: AudioClip = { id: newId('clip'), duration, mimeType, transcript: transcript.current.join(' '), createdDate: new Date().toISOString() }
      await putClipAudio(clip.id, blob)
      handlers.current.onClip(clip)
    } catch {
      setError('The recording could not be saved.')
    }
    setMode('idle')
  }

  const toggleDictation = () => {
    if (mode === 'dictating') {
      stopListening()
      setMode('idle')
      return
    }
    if (mode !== 'idle') return
    setError('')
    startListening('dictation', (text) => handlers.current.onDictated(text))
    setMode('dictating')
  }

  const toggleRecording = () => {
    if (mode === 'recording') {
      void stopRecording()
      return
    }
    if (mode === 'dictating') stopListening()
    else if (mode !== 'idle') return
    setError('')
    transcript.current = []
    setMode('starting')
    abandoned.current = false
    startRecording()
      .then((active) => {
        if (abandoned.current) {
          active.cancel()
          return
        }
        recording.current = active
        setElapsed(0)
        setMode('recording')
        const startedAt = performance.now()
        ticker.current = window.setInterval(() => {
          setElapsed((performance.now() - startedAt) / 1000)
          setLevel(active.level())
        }, 100)
        if (speechRecognitionSupported()) startListening('recording', (text) => transcript.current.push(text))
      })
      .catch(() => {
        if (abandoned.current) return
        setError('Microphone permission was denied.')
        setMode('idle')
      })
  }

  const finish = async () => {
    if (mode === 'starting') abandoned.current = true
    if (mode === 'dictating') {
      stopListening()
      setMode('idle')
    }
    await stopRecording()
  }

  useEffect(
    () => () => {
      abandoned.current = true
      stopTicker()
      stopListening()
      recording.current?.cancel()
    },
    []
  )

  return {
    mode,
    partial,
    elapsed,
    level,
    error,
    canDictate: speechRecognitionSupported(),
    canRecord: recordingSupported(),
    toggleDictation,
    toggleRecording,
    finish
  }
}
