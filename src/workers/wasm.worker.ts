/// <reference lib="webworker" />
import init, {
  fibonacci,
  process_shared_buffer,
  sum_u32,
  sum_u32_sab,
  grayscale,
  box_blur,
  fft_demo,
  generate_signal,
  matrix_multiply,
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

// JS implementations for fair comparison (both run in worker thread)
function fibonacciJS(n: number): number {
  if (n <= 1) return n;
  return fibonacciJS(n - 1) + fibonacciJS(n - 2);
}

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

const postMessageSafe = (message: WorkerResponse) => {
  self.postMessage(message);
};

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
    if (!isInitialized) {
      await init();
      isInitialized = true;
    }

    switch (message.type) {
      case 'ping': {
        postMessageSafe({
          type: 'ready',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
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

        if (message.length * 4 > message.buffer.byteLength || message.control.byteLength < 4) {
          postMessageSafe({
            type: 'error',
            requestId: message.requestId,
            version: WORKER_PROTOCOL_VERSION,
            message: 'Invalid shared buffer sizes.',
          });
          break;
        }

        const view = new Uint32Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        process_shared_buffer(view);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'sharedBufferDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
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
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'sumArraySabResult',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          result,
        });
        break;
      }
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
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
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
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'boxBlurDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
      case 'fftDemo': {
        const inputView = new Float64Array(message.inputBuffer, 0, message.size);
        const outputView = new Float64Array(message.outputBuffer, 0, message.size);
        const control = new Int32Array(message.control);
        fft_demo(inputView, outputView);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
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
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'generateSignalDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
      case 'matrixMultiply': {
        const n = message.n;
        const aView = new Float64Array(message.aBuffer, 0, n * n);
        const bView = new Float64Array(message.bBuffer, 0, n * n);
        const cView = new Float64Array(message.cBuffer, 0, n * n);
        const control = new Int32Array(message.control);
        matrix_multiply(aView, bView, cView, n);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'matrixMultiplyDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
      case 'quicksort': {
        const view = new Float64Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        quicksort(view);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'quicksortDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
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
      case 'matrixMultiplyJs': {
        const n = message.n;
        const aView = new Float64Array(message.aBuffer, 0, n * n);
        const bView = new Float64Array(message.bBuffer, 0, n * n);
        const cView = new Float64Array(message.cBuffer, 0, n * n);
        const control = new Int32Array(message.control);
        matrixMultiplyJS(aView, bView, cView, n);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
        postMessageSafe({
          type: 'matrixMultiplyJsDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
        });
        break;
      }
      case 'quicksortJs': {
        const view = new Float64Array(message.buffer, 0, message.length);
        const control = new Int32Array(message.control);
        quicksortJS(view);
        Atomics.store(control, 0, 1);
        Atomics.notify(control, 0, 1);
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
