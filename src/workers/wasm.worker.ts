/// <reference lib="webworker" />
import init, {
  fibonacci,
  fibonacci_iter,
  process_shared_buffer,
  sum_u32,
  sum_u32_sab,
  sum_f32_simd,
  dot_product_simd,
  grayscale,
  box_blur,
  fft_demo,
  generate_signal,
  matrix_multiply,
  matrix_multiply_strassen,
  quicksort,
} from '../../.wasm/pkg/wasm_lib';
import {
  isWorkerRequest,
  MAX_BUFFER_LENGTH,
  MAX_MATRIX_SIZE,
  MAX_IMAGE_SIZE,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-messages';

let isInitialized = false;
let wasmExports: WasmExports | null = null;

const STRASSEN_MIN_N = 128;
const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

type WasmExports = {
  memory: WebAssembly.Memory;
  alloc_f64: (len: number) => number;
  free_f64: (ptr: number, len: number) => void;
  matrix_multiply_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  matrix_multiply_strassen_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  quicksort_ptr: (ptr: number, len: number) => void;
};

// ============================================================================
// JS IMPLEMENTATIONS (for fair comparison - both run in worker thread)
// ============================================================================

/** Recursive Fibonacci - O(2^n) */
function fibonacciJS(n: number): number {
  if (n <= 1) return n;
  return fibonacciJS(n - 1) + fibonacciJS(n - 2);
}

/** Iterative Fibonacci - O(n) */
function fibonacciIterJS(n: number): bigint {
  if (n === 0) return 0n;
  let a = 0n, b = 1n;
  for (let i = 1; i < n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

/** Naive Matrix Multiplication - O(n³) */
function matrixMultiplyJS(a: Float64Array, b: Float64Array, c: Float64Array, n: number): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += a[i * n + k] * b[k * n + j];
      }
      c[i * n + j] = sum;
    }
  }
}

/** Quicksort - O(n log n) average */
function quicksortJS(arr: Float64Array): void {
  quicksortImpl(arr, 0, arr.length - 1);
}

function quicksortImpl(arr: Float64Array, low: number, high: number): void {
  if (low < high) {
    const pivot = partition(arr, low, high);
    quicksortImpl(arr, low, pivot - 1);
    quicksortImpl(arr, pivot + 1, high);
  }
}

function partition(arr: Float64Array, low: number, high: number): number {
  const pivotVal = arr[high];
  let i = low;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivotVal) {
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
      i++;
    }
  }
  const temp = arr[i];
  arr[i] = arr[high];
  arr[high] = temp;
  return i;
}

// ============================================================================
// WORKER COMMUNICATION
// ============================================================================

const postMessageSafe = (message: WorkerResponse) => {
  self.postMessage(message);
};

const signalComplete = (control: Int32Array) => {
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0, 1);
};

const ensureWasm = async (): Promise<WasmExports> => {
  if (!isInitialized) {
    const exports = await init();
    wasmExports = exports as unknown as WasmExports;
    isInitialized = true;
  }
  if (!wasmExports) {
    throw new Error('WASM exports not available');
  }
  return wasmExports;
};

const allocF64View = (wasm: WasmExports, len: number) => {
  const ptr = wasm.alloc_f64(len);
  if (!ptr) {
    throw new Error('WASM alloc failed');
  }
  const view = new Float64Array(wasm.memory.buffer, ptr, len);
  return { ptr, view };
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const message = e.data;

  if (!isWorkerRequest(message)) {
    postMessageSafe({
      type: 'error',
      requestId: 'unknown',
      version: WORKER_PROTOCOL_VERSION,
      message: 'Invalid worker message',
    });
    return;
  }

  try {
    // Streaming WASM instantiation for faster startup
    await ensureWasm();

    switch (message.type) {
      // ========== PING ==========
      case 'ping': {
        postMessageSafe({
          type: 'ready',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'warmup': {
        // JIT Warming / WASM Tier-up - Reduced load to prevent blocking
        try {
          // 1. Fibonacci (lighter)
          fibonacci(28);
          fibonacciJS(28);

          // 2. Matrix Multiplication (small)
          const n = 30;
          const aWarm = new Float64Array(n * n).fill(1.0);
          const bWarm = new Float64Array(n * n).fill(1.0);
          const cWarm = new Float64Array(n * n);
          matrix_multiply(aWarm, bWarm, cWarm, n);
          matrixMultiplyJS(aWarm, bWarm, cWarm, n);

          // 3. Quicksort
          const arr = new Float64Array(500).map(() => Math.random());
          quicksort(arr.slice()); // copy
          quicksortJS(arr.slice());

          // 4. SharedArrayBuffer
          if (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
            const length = 50;
            const sab = new SharedArrayBuffer(length * 4);
            const view = new Uint32Array(sab);
            for(let i=0; i<length; i++) view[i] = 10;
            process_shared_buffer(view);
          }

          // 5. Pointer-based WASM (direct memory)
          const wasm = await ensureWasm();
          const size = 16;
          const count = size * size;
          let aPtr = null as null | { ptr: number; view: Float64Array };
          let bPtr = null as null | { ptr: number; view: Float64Array };
          let cPtr = null as null | { ptr: number; view: Float64Array };
          try {
            aPtr = allocF64View(wasm, count);
            bPtr = allocF64View(wasm, count);
            cPtr = allocF64View(wasm, count);
            aPtr.view = new Float64Array(wasm.memory.buffer, aPtr.ptr, count);
            bPtr.view = new Float64Array(wasm.memory.buffer, bPtr.ptr, count);
            cPtr.view = new Float64Array(wasm.memory.buffer, cPtr.ptr, count);
            for (let i = 0; i < count; i++) {
              aPtr.view[i] = Math.random();
              bPtr.view[i] = Math.random();
            }
            wasm.matrix_multiply_ptr(aPtr.ptr, bPtr.ptr, cPtr.ptr, size);
            wasm.quicksort_ptr(cPtr.ptr, count);
          } finally {
            if (aPtr) wasm.free_f64(aPtr.ptr, count);
            if (bPtr) wasm.free_f64(bPtr.ptr, count);
            if (cPtr) wasm.free_f64(cPtr.ptr, count);
          }
        } catch (e) {
          console.warn('Warmup partial failure:', e);
        }

        postMessageSafe({
          type: 'warmupDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      // ========== FIBONACCI ==========
      case 'fibonacci': {
        const result = fibonacci(message.n);
        postMessageSafe({
          type: 'fibonacciResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      case 'fibonacciIter': {
        const result = fibonacci_iter(message.n);
        postMessageSafe({
          type: 'fibonacciIterResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      case 'fibonacciBatch': {
        let result = 0;
        for (let i = 0; i < message.iterations; i += 1) {
          result = fibonacci(message.n);
        }
        postMessageSafe({
          type: 'fibonacciBatchResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
          iterations: message.iterations,
        });
        break;
      }

      case 'fibonacciBatchJs': {
        let result = 0;
        for (let i = 0; i < message.iterations; i += 1) {
          result = fibonacciJS(message.n);
        }
        postMessageSafe({
          type: 'fibonacciBatchJsResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
          iterations: message.iterations,
        });
        break;
      }

      case 'fibonacciIterBatch': {
        let result = 0n;
        for (let i = 0; i < message.iterations; i += 1) {
          result = fibonacciIterJS(message.n);
        }
        postMessageSafe({
          type: 'fibonacciIterBatchResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
          iterations: message.iterations,
        });
        break;
      }

      // ========== SHARED BUFFER ==========
      case 'sharedBufferProcess': {
        if (message.length > MAX_BUFFER_LENGTH) {
          const control = new Int32Array(message.control);
          signalComplete(control);
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Shared buffer length exceeds limit (${MAX_BUFFER_LENGTH}).`,
          });
          break;
        }

        const view = new Uint32Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        const start = performance.now();
        process_shared_buffer(view);
        const durationMs = performance.now() - start;
        signalComplete(control);
        postMessageSafe({
          type: 'sharedBufferDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          durationMs,
        });
        break;
      }

      // ========== ARRAY OPERATIONS ==========
      case 'sumArray': {
        if (message.data.length > MAX_BUFFER_LENGTH) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
          });
          break;
        }
        const result = sum_u32(message.data);
        postMessageSafe({
          type: 'sumArrayResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      case 'sumArraySab': {
        if (message.length > MAX_BUFFER_LENGTH) {
          const control = new Int32Array(message.control);
          signalComplete(control);
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
          });
          break;
        }
        const view = new Uint32Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        const result = sum_u32_sab(view);
        signalComplete(control);
        postMessageSafe({
          type: 'sumArraySabResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      // ========== SIMD OPERATIONS ==========
      case 'dotProductSimd': {
        const aView = new Float32Array(message.aBuffer, 0, message.length);
        const bView = new Float32Array(message.bBuffer, 0, message.length);
        const control = new Int32Array(message.control);
        const result = dot_product_simd(aView, bView);
        signalComplete(control);
        postMessageSafe({
          type: 'dotProductSimdResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      case 'sumF32Simd': {
        const view = new Float32Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        const result = sum_f32_simd(view);
        signalComplete(control);
        postMessageSafe({
          type: 'sumF32SimdResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }

      // ========== IMAGE PROCESSING ==========
      case 'grayscale': {
        if (message.length > MAX_IMAGE_SIZE) {
          const control = new Int32Array(message.control);
          signalComplete(control);
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Image size exceeds limit.`,
          });
          break;
        }
        const view = new Uint8Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        grayscale(view);
        signalComplete(control);
        postMessageSafe({
          type: 'grayscaleDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'boxBlur': {
        const imageSize = message.width * message.height * 4;
        if (imageSize > MAX_IMAGE_SIZE) {
          const control = new Int32Array(message.control);
          signalComplete(control);
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Image size exceeds limit.`,
          });
          break;
        }
        const view = new Uint8Array(message.buffer, 0, imageSize);
        const control = new Int32Array(message.control);
        box_blur(view, message.width, message.height, message.radius);
        signalComplete(control);
        postMessageSafe({
          type: 'boxBlurDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      // ========== FFT ==========
      case 'fftDemo': {
        const inputView = new Float64Array(message.inputBuffer, 0, message.size);
        const outputView = new Float64Array(message.outputBuffer, 0, message.size);
        const control = new Int32Array(message.control);
        fft_demo(inputView, outputView);
        signalComplete(control);
        postMessageSafe({
          type: 'fftDemoDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'generateSignal': {
        const view = new Float64Array(message.buffer, 0, message.size);
        const control = new Int32Array(message.control);
        generate_signal(view, message.freq1, message.freq2, message.freq3);
        signalComplete(control);
        postMessageSafe({
          type: 'generateSignalDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      // ========== MATRIX OPERATIONS ==========
      case 'matrixMultiply': {
        const n = message.n;
        const aView = new Float64Array(message.aBuffer, 0, n * n);
        const bView = new Float64Array(message.bBuffer, 0, n * n);
        const cView = new Float64Array(message.cBuffer, 0, n * n);
        const control = new Int32Array(message.control);
        matrix_multiply(aView, bView, cView, n);
        signalComplete(control);
        postMessageSafe({
          type: 'matrixMultiplyDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'matrixMultiplyJs': {
        const n = message.n;
        const aView = new Float64Array(message.aBuffer, 0, n * n);
        const bView = new Float64Array(message.bBuffer, 0, n * n);
        const cView = new Float64Array(message.cBuffer, 0, n * n);
        const control = new Int32Array(message.control);
        matrixMultiplyJS(aView, bView, cView, n);
        signalComplete(control);
        postMessageSafe({
          type: 'matrixMultiplyJsDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'matrixMultiplyStrassen': {
        const n = message.n;
        const aView = new Float64Array(message.aBuffer, 0, n * n);
        const bView = new Float64Array(message.bBuffer, 0, n * n);
        const cView = new Float64Array(message.cBuffer, 0, n * n);
        const control = new Int32Array(message.control);
        matrix_multiply_strassen(aView, bView, cView, n);
        signalComplete(control);
        postMessageSafe({
          type: 'matrixMultiplyStrassenDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'matrixMultiplyJsBench': {
        const n = Math.min(message.n, MAX_MATRIX_SIZE);
        if (n <= 0) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: 'Matrix size must be greater than zero.',
          });
          break;
        }
        const size = n * n;
        const a = new Float64Array(size);
        const b = new Float64Array(size);
        const c = new Float64Array(size);
        for (let i = 0; i < size; i++) {
          a[i] = Math.random();
          b[i] = Math.random();
        }
        const start = performance.now();
        matrixMultiplyJS(a, b, c, n);
        const durationMs = performance.now() - start;
        postMessageSafe({
          type: 'matrixMultiplyJsBenchDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          durationMs,
        });
        break;
      }

      case 'matrixMultiplyWasmBench': {
        const n = Math.min(message.n, MAX_MATRIX_SIZE);
        if (n <= 0) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: 'Matrix size must be greater than zero.',
          });
          break;
        }
        const wasm = await ensureWasm();
        const size = n * n;
        let a = null as null | { ptr: number; view: Float64Array };
        let b = null as null | { ptr: number; view: Float64Array };
        let c = null as null | { ptr: number; view: Float64Array };
        try {
          a = allocF64View(wasm, size);
          b = allocF64View(wasm, size);
          c = allocF64View(wasm, size);
          a.view = new Float64Array(wasm.memory.buffer, a.ptr, size);
          b.view = new Float64Array(wasm.memory.buffer, b.ptr, size);
          c.view = new Float64Array(wasm.memory.buffer, c.ptr, size);
          for (let i = 0; i < size; i++) {
            a.view[i] = Math.random();
            b.view[i] = Math.random();
          }
          const algorithmUsed =
            message.algorithm === 'strassen' && n >= STRASSEN_MIN_N && isPowerOfTwo(n)
              ? 'strassen'
              : 'naive';
          const start = performance.now();
          if (algorithmUsed === 'strassen') {
            wasm.matrix_multiply_strassen_ptr(a.ptr, b.ptr, c.ptr, n);
          } else {
            wasm.matrix_multiply_ptr(a.ptr, b.ptr, c.ptr, n);
          }
          const durationMs = performance.now() - start;
          postMessageSafe({
            type: 'matrixMultiplyWasmBenchDone',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            durationMs,
            algorithmUsed,
          });
        } finally {
          if (a) wasm.free_f64(a.ptr, size);
          if (b) wasm.free_f64(b.ptr, size);
          if (c) wasm.free_f64(c.ptr, size);
        }
        break;
      }

      // ========== SORTING ==========
      case 'quicksort': {
        const view = new Float64Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        quicksort(view);
        signalComplete(control);
        postMessageSafe({
          type: 'quicksortDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'quicksortJs': {
        const view = new Float64Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        quicksortJS(view);
        signalComplete(control);
        postMessageSafe({
          type: 'quicksortJsDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }

      case 'quicksortJsBench': {
        if (message.length > MAX_BUFFER_LENGTH) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
          });
          break;
        }
        const arr = new Float64Array(message.length);
        for (let i = 0; i < message.length; i++) {
          arr[i] = Math.random();
        }
        const start = performance.now();
        quicksortJS(arr);
        const durationMs = performance.now() - start;
        postMessageSafe({
          type: 'quicksortJsBenchDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          durationMs,
        });
        break;
      }

      case 'quicksortWasmBench': {
        if (message.length > MAX_BUFFER_LENGTH) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
          });
          break;
        }
        const wasm = await ensureWasm();
        let buffer = null as null | { ptr: number; view: Float64Array };
        try {
          buffer = allocF64View(wasm, message.length);
          for (let i = 0; i < message.length; i++) {
            buffer.view[i] = Math.random();
          }
          const start = performance.now();
          wasm.quicksort_ptr(buffer.ptr, message.length);
          const durationMs = performance.now() - start;
          postMessageSafe({
            type: 'quicksortWasmBenchDone',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            durationMs,
          });
        } finally {
          if (buffer) wasm.free_f64(buffer.ptr, message.length);
        }
        break;
      }

      default: {
        const _exhaustiveCheck: never = message;
        void _exhaustiveCheck;
      }
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown worker error';
    postMessageSafe({
      type: 'error',
      requestId: message.requestId,
      version: WORKER_PROTOCOL_VERSION,
      message: messageText,
    });
  }
};
