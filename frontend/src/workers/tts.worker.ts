/**
 * Speech worker: runs the Kokoro-82M text-to-speech model in the browser with kokoro-js,
 * off the main thread so the page stays responsive while audio is generated.
 */
import { KokoroTTS, env } from 'kokoro-js'
import type { TTSDevice, TTSWorkerRequest, TTSWorkerResponse } from './ttsMessages'

// transformers.js loads the ONNX runtime from the jsDelivr CDN by default. Production builds clear
// that path so the runtime bundled with the site is used instead (same files, served from our origin).
// The dev server can't serve the bundled file from its pre-bundled dependencies, so dev keeps the CDN.
if (import.meta.env.PROD) {
  env.wasmPaths = undefined as unknown as typeof env.wasmPaths
}

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'
// Same voice the Python backend used
const VOICE = 'af_sky'
// kokoro-js recommends full precision on WebGPU; on the CPU (WASM) the 8-bit model is much faster
const DTYPE_FOR_DEVICE = { webgpu: 'fp32', wasm: 'q8' } as const

interface FileProgress {
  status: string
  file?: string
  loaded?: number
  total?: number
}

let modelPromise: Promise<KokoroTTS> | null = null
// Generation requests run one at a time, in arrival order
let generationQueue: Promise<void> = Promise.resolve()

function post(message: TTSWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer })
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Use the GPU when the browser offers a real (non-software) WebGPU adapter */
async function detectDevice(): Promise<TTSDevice> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    const adapter = (await gpu?.requestAdapter()) as
      | { isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } }
      | null
      | undefined
    if (adapter && !adapter.isFallbackAdapter && !adapter.info?.isFallbackAdapter) {
      return 'webgpu'
    }
  } catch {
    // No usable WebGPU
  }
  return 'wasm'
}

/**
 * Report download progress of the model weights (the .onnx file; the other files are a few KB),
 * at most once per percent
 */
function createProgressReporter() {
  let lastPercent = -1
  return (info: FileProgress) => {
    if (info.status !== 'progress' || !info.file?.endsWith('.onnx')) return
    const loaded = info.loaded ?? 0
    const total = info.total ?? 0
    const percent = total > 0 ? Math.floor((loaded / total) * 100) : 0
    if (percent !== lastPercent) {
      lastPercent = percent
      post({ type: 'progress', loaded, total })
    }
  }
}

async function loadOn(device: TTSDevice): Promise<KokoroTTS> {
  post({ type: 'loading', device })
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
    dtype: DTYPE_FOR_DEVICE[device],
    device,
    progress_callback: createProgressReporter(),
  })
  // Warm up: compiles the GPU shaders, downloads the voice and proves the device produces real audio
  const audio = await tts.generate('Ready.', { voice: VOICE })
  if (audio.audio.length === 0 || audio.audio.some((sample) => !Number.isFinite(sample))) {
    throw new Error(`The ${device} backend produced invalid audio`)
  }
  post({ type: 'ready', device })
  console.log(`✅ Kokoro-82M loaded on ${device} (${DTYPE_FOR_DEVICE[device]})`)
  return tts
}

async function loadModel(): Promise<KokoroTTS> {
  const device = await detectDevice()
  if (device === 'wasm') {
    return loadOn('wasm')
  }
  try {
    return await loadOn('webgpu')
  } catch (err) {
    console.warn('⚠️  WebGPU failed, falling back to WASM:', err)
    return loadOn('wasm')
  }
}

function getModel(): Promise<KokoroTTS> {
  modelPromise ??= loadModel().catch((err) => {
    modelPromise = null // Allow a retry on the next request
    post({ type: 'load-error', message: errorMessage(err) })
    throw err
  })
  return modelPromise
}

async function generate(id: number, text: string, speed: number) {
  try {
    const tts = await getModel()
    const audio = await tts.generate(text, { voice: VOICE, speed })
    // Copy unless the samples own their whole buffer, so the buffer can be transferred
    const raw = audio.audio
    const samples =
      raw.buffer instanceof ArrayBuffer && raw.byteOffset === 0 && raw.byteLength === raw.buffer.byteLength
        ? raw
        : raw.slice()
    post({ type: 'audio', id, samples, sampleRate: audio.sampling_rate }, [samples.buffer as ArrayBuffer])
  } catch (err) {
    post({ type: 'generate-error', id, message: errorMessage(err) })
  }
}

self.addEventListener('message', (event: MessageEvent<TTSWorkerRequest>) => {
  const message = event.data
  if (message.type === 'load') {
    getModel().catch(() => {
      // Already reported as load-error
    })
  } else if (message.type === 'generate') {
    generationQueue = generationQueue.then(() => generate(message.id, message.text, message.speed))
  }
})
