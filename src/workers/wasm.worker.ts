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
  MAX_IMAGE_SIZE,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-messages';

let isInitialized = false;

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
    if (!isInitialized) {
      await init();
      isInitialized = true;
    }

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
        // JIT Warming / WASM Tier-up
        try {
          // 1. Fibonacci
          fibonacci(35);
          fibonacciJS(35);

          // 2. Matrix Multiplication (small)
          const n = 50;
          const a = new Float64Array(n * n).fill(1.0);
          const b = new Float64Array(n * n).fill(1.0);
          const c = new Float64Array(n * n);
          matrix_multiply(a, b, c, n);
          matrixMultiplyJS(a, b, c, n);

          // 3. Quicksort
          const arr = new Float64Array(1000).map(() => Math.random());
          quicksort(arr.slice()); // copy
          quicksortJS(arr.slice());

          // 4. SharedArrayBuffer (if supported)
          if (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
            const length = 100;
            const sab = new SharedArrayBuffer(length * 4);
            const view = new Uint32Array(sab);
            for(let i=0; i<length; i++) view[i] = 10; // fib(10)
            process_shared_buffer(view);
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
        process_shared_buffer(view);
        signalComplete(control);
        postMessageSafe({
          type: 'sharedBufferDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
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
