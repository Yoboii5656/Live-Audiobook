/** Messages exchanged between the app and the speech worker (tts.worker.ts) */

export type TTSDevice = 'webgpu' | 'wasm'

export type TTSWorkerRequest =
  | { type: 'load' }
  | { type: 'generate'; id: number; text: string; speed: number }

export type TTSWorkerResponse =
  | { type: 'loading'; device: TTSDevice }
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; device: TTSDevice }
  | { type: 'load-error'; message: string }
  | { type: 'audio'; id: number; samples: Float32Array; sampleRate: number }
  | { type: 'generate-error'; id: number; message: string }
