/** MediaRecorder wrapper with a live input level for the recording meter. */

export interface ActiveRecording {
  /** 0–1 loudness of the current input, for the level meter. */
  level: () => number
  stop: () => Promise<{ blob: Blob; duration: number; mimeType: string }>
  cancel: () => void
}

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

export function recordingSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.MediaRecorder === 'function' && Boolean(navigator.mediaDevices?.getUserMedia)
}

export async function startRecording(): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const audio = new AudioContext()
  const analyser = audio.createAnalyser()
  analyser.fftSize = 256
  audio.createMediaStreamSource(stream).connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)

  const startedAt = performance.now()
  recorder.start(250)

  const release = () => {
    for (const track of stream.getTracks()) track.stop()
    void audio.close()
  }

  return {
    level: () => {
      analyser.getByteTimeDomainData(samples)
      let peak = 0
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128))
      return Math.min(1, peak / 64)
    },
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release()
          const type = recorder.mimeType || mimeType || 'audio/webm'
          resolve({ blob: new Blob(chunks, { type }), duration: (performance.now() - startedAt) / 1000, mimeType: type })
        }
        recorder.stop()
      }),
    cancel: () => {
      recorder.onstop = release
      if (recorder.state !== 'inactive') recorder.stop()
      else release()
    }
  }
}

/** `1:05` */
export function clipTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
