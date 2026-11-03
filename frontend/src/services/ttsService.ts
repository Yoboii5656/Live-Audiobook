/**
 * Main-thread side of the speech worker. Loads the voice model once per page visit
 * and turns sentences into audio samples.
 */
import type { TTSDevice, TTSWorkerRequest, TTSWorkerResponse } from '../workers/ttsMessages'

export type VoiceModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface VoiceModelState {
  status: VoiceModelStatus
  /** Download progress of the model files, from 0 to 1 */
  progress: number
  device: TTSDevice | null
  error: string | null
}

export interface GeneratedAudio {
  samples: Float32Array
  sampleRate: number
}

interface PendingRequest {
  resolve: (audio: GeneratedAudio) => void
  reject: (err: Error) => void
}

class TTSService {
  private worker: Worker | null = null
  private state: VoiceModelState = { status: 'idle', progress: 0, device: null, error: null }
  private readonly listeners = new Set<() => void>()
  private readonly pending = new Map<number, PendingRequest>()
  private nextId = 1

  /** Subscribe to voice model state changes (for React's useSyncExternalStore) */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getState = (): VoiceModelState => this.state

  /** Start downloading and preparing the voice model. Does nothing if it is loading or ready. */
  load(): void {
    if (this.state.status === 'loading' || this.state.status === 'ready') return
    this.setState({ status: 'loading', progress: 0, error: null })
    this.send({ type: 'load' })
  }

  /** Generate speech for one sentence. Loads the model first if needed. */
  generate(text: string, speed: number): Promise<GeneratedAudio> {
    this.load()
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.send({ type: 'generate', id, text, speed })
    })
  }

  private send(message: TTSWorkerRequest) {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/tts.worker.ts', import.meta.url), { type: 'module' })
      this.worker.addEventListener('message', this.handleMessage)
      this.worker.addEventListener('error', this.handleWorkerError)
    }
    this.worker.postMessage(message)
  }

  private handleMessage = (event: MessageEvent<TTSWorkerResponse>) => {
    const message = event.data
    switch (message.type) {
      case 'loading':
        this.setState({ status: 'loading', progress: 0, device: message.device, error: null })
        break
      case 'progress':
        if (message.total > 0) {
          this.setState({ progress: message.loaded / message.total })
        }
        break
      case 'ready':
        this.setState({ status: 'ready', progress: 1, device: message.device, error: null })
        break
      case 'load-error':
        this.setState({ status: 'error', error: message.message })
        break
      case 'audio':
        this.settle(message.id)?.resolve({ samples: message.samples, sampleRate: message.sampleRate })
        break
      case 'generate-error':
        this.settle(message.id)?.reject(new Error(message.message))
        break
    }
  }

  // The worker script itself failed, e.g. it could not be downloaded
  private handleWorkerError = (event: ErrorEvent) => {
    const message = event.message || 'The speech engine failed to start'
    this.worker?.terminate()
    this.worker = null
    this.setState({ status: 'error', error: message })
    for (const request of this.pending.values()) {
      request.reject(new Error(message))
    }
    this.pending.clear()
  }

  private settle(id: number): PendingRequest | undefined {
    const request = this.pending.get(id)
    this.pending.delete(id)
    return request
  }

  private setState(update: Partial<VoiceModelState>) {
    this.state = { ...this.state, ...update }
    this.listeners.forEach((listener) => listener())
  }
}

export const ttsService = new TTSService()
