/**
 * Thin, typed wrapper over the Web Speech API. Recognition is Chromium/Safari
 * only; callers check `speechRecognitionSupported()` and fall back to typing.
 * A cloud speech-to-text service can replace this behind the same interface.
 */

export interface SpeechSession {
  stop: () => void
}

export interface ListenOptions {
  lang?: string
  /** Keep listening across pauses instead of stopping after the first phrase. */
  continuous?: boolean
  onPartial?: (text: string) => void
  onResult: (text: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

interface RecognitionAlternative {
  transcript: string
}

interface RecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: RecognitionAlternative
}

interface RecognitionEvent {
  readonly resultIndex: number
  readonly results: { readonly length: number; [index: number]: RecognitionResult }
}

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type RecognitionConstructor = new () => Recognition

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate: unknown = Reflect.get(window, 'SpeechRecognition') ?? Reflect.get(window, 'webkitSpeechRecognition')
  return typeof candidate === 'function' ? (candidate as RecognitionConstructor) : null
}

export function speechRecognitionSupported(): boolean {
  return recognitionClass() !== null
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied.',
  'no-speech': 'No speech detected.',
  'audio-capture': 'No microphone found.',
  network: 'Speech service unreachable.'
}

export function listen({ lang = 'en-PH', continuous = false, onPartial, onResult, onError, onEnd }: ListenOptions): SpeechSession | null {
  const Recognition = recognitionClass()
  if (Recognition === null) return null
  const recognition = new Recognition()
  recognition.lang = lang
  recognition.interimResults = true
  recognition.continuous = continuous
  recognition.onresult = (event) => {
    let partial = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0]?.transcript ?? ''
      if (result.isFinal) onResult(transcript.trim())
      else partial += transcript
    }
    if (partial) onPartial?.(partial.trim())
  }
  recognition.onerror = (event) => onError?.(ERRORS[event.error] ?? `Speech error: ${event.error}`)
  recognition.onend = () => onEnd?.()
  recognition.start()
  return { stop: () => recognition.stop() }
}

export function speak(text: string, lang = 'en-PH'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  window.speechSynthesis.speak(utterance)
}
