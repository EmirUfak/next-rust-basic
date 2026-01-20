import {
  fibonacci,
  fibonacci_iter,
  matrix_multiply,
  matrix_multiply_strassen,
  process_shared_buffer,
  quicksort,
} from '../../../../.wasm/pkg/wasm_lib';
import {
  MAX_BUFFER_LENGTH,
  MAX_MATRIX_SIZE,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
} from '../../worker-messages';
import {
  allocF64View,
  getStrassenThresholdSafe,
  makeRng,
  tuneStrassenThreshold,
} from '../wasm-utils';
import {
  fibonacciIterJS,
  fibonacciJS,
  matrixMultiplyJS,
  quicksortJS,
} from '../js-impl';
import type { HandlerDeps } from './types';

export const handleBenchMessage = async (
  message: WorkerRequest,
  deps: HandlerDeps
): Promise<boolean> => {
  switch (message.type) {
    case 'warmup': {
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
        const warmRng = makeRng(0xfeedbabe);
        const arr = new Float64Array(500);
        for (let i = 0; i < arr.length; i++) {
          arr[i] = warmRng();
        }
        quicksort(arr.slice()); // copy
        quicksortJS(arr.slice());

        // 4. SharedArrayBuffer
        if (self.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
          const length = 50;
          const sab = new SharedArrayBuffer(length * 4);
          const view = new Uint32Array(sab);
          for (let i = 0; i < length; i++) view[i] = 10;
          process_shared_buffer(view);
        }

        // 5. Pointer-based WASM (direct memory)
        const wasm = await deps.ensureWasm();
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
          const ptrRng = makeRng(0x12345678);
          for (let i = 0; i < count; i++) {
            aPtr.view[i] = ptrRng();
            bPtr.view[i] = ptrRng();
          }
          wasm.matrix_multiply_ptr(aPtr.ptr, bPtr.ptr, cPtr.ptr, size);
          wasm.quicksort_ptr(cPtr.ptr, count);
        } finally {
          if (aPtr) wasm.free_f64(aPtr.ptr, count);
          if (bPtr) wasm.free_f64(bPtr.ptr, count);
          if (cPtr) wasm.free_f64(cPtr.ptr, count);
        }

        await tuneStrassenThreshold(wasm);
      } catch (error) {
        console.warn('Warmup partial failure:', error);
      }

      deps.postMessageSafe({
        type: 'warmupDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    // ========== FIBONACCI ==========
    case 'fibonacci': {
      const result = fibonacci(message.n);
      deps.postMessageSafe({
        type: 'fibonacciResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    case 'fibonacciIter': {
      const result = fibonacci_iter(message.n);
      deps.postMessageSafe({
        type: 'fibonacciIterResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    case 'fibonacciBatch': {
      let result = 0;
      for (let i = 0; i < message.iterations; i += 1) {
        result = fibonacci(message.n);
      }
      deps.postMessageSafe({
        type: 'fibonacciBatchResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
        iterations: message.iterations,
      });
      return true;
    }

    case 'fibonacciBatchJs': {
      let result = 0;
      for (let i = 0; i < message.iterations; i += 1) {
        result = fibonacciJS(message.n);
      }
      deps.postMessageSafe({
        type: 'fibonacciBatchJsResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
        iterations: message.iterations,
      });
      return true;
    }

    case 'fibonacciIterBatch': {
      let result = 0n;
      for (let i = 0; i < message.iterations; i += 1) {
        result = fibonacciIterJS(message.n);
      }
      deps.postMessageSafe({
        type: 'fibonacciIterBatchResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
        iterations: message.iterations,
      });
      return true;
    }

    // ========== MATRIX OPERATIONS ==========
    case 'matrixMultiply': {
      const n = message.n;
      const aView = new Float64Array(message.aBuffer, 0, n * n);
      const bView = new Float64Array(message.bBuffer, 0, n * n);
      const cView = new Float64Array(message.cBuffer, 0, n * n);
      const control = new Int32Array(message.control);
      matrix_multiply(aView, bView, cView, n);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'matrixMultiplyDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'matrixMultiplyJs': {
      const n = message.n;
      const aView = new Float64Array(message.aBuffer, 0, n * n);
      const bView = new Float64Array(message.bBuffer, 0, n * n);
      const cView = new Float64Array(message.cBuffer, 0, n * n);
      const control = new Int32Array(message.control);
      matrixMultiplyJS(aView, bView, cView, n);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'matrixMultiplyJsDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'matrixMultiplyStrassen': {
      const n = message.n;
      const aView = new Float64Array(message.aBuffer, 0, n * n);
      const bView = new Float64Array(message.bBuffer, 0, n * n);
      const cView = new Float64Array(message.cBuffer, 0, n * n);
      const control = new Int32Array(message.control);
      matrix_multiply_strassen(aView, bView, cView, n);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'matrixMultiplyStrassenDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'matrixMultiplyJsBench': {
      const n = Math.min(message.n, MAX_MATRIX_SIZE);
      if (n <= 0) {
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: 'Matrix size must be greater than zero.',
        });
        return true;
      }
      const size = n * n;
      const a = new Float64Array(size);
      const b = new Float64Array(size);
      const c = new Float64Array(size);
      const rng = makeRng(0xa5a5a5a5 ^ n);
      for (let i = 0; i < size; i++) {
        a[i] = rng();
        b[i] = rng();
      }
      const start = performance.now();
      matrixMultiplyJS(a, b, c, n);
      const durationMs = performance.now() - start;
      deps.postMessageSafe({
        type: 'matrixMultiplyJsBenchDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        durationMs,
      });
      return true;
    }

    case 'matrixMultiplyWasmBench': {
      const n = Math.min(message.n, MAX_MATRIX_SIZE);
      if (n <= 0) {
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: 'Matrix size must be greater than zero.',
        });
        return true;
      }
      const wasm = await deps.ensureWasm();
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
        const rng = makeRng(0x1f2e3d4c ^ n);
        for (let i = 0; i < size; i++) {
          a.view[i] = rng();
          b.view[i] = rng();
        }
        const strassenThreshold = getStrassenThresholdSafe();
        const algorithmUsed =
          message.algorithm === 'strassen' &&
          n >= strassenThreshold &&
          deps.isPowerOfTwo(n)
            ? 'strassen'
            : 'naive';
        const start = performance.now();
        if (algorithmUsed === 'strassen') {
          wasm.matrix_multiply_strassen_ptr(a.ptr, b.ptr, c.ptr, n);
        } else {
          wasm.matrix_multiply_ptr(a.ptr, b.ptr, c.ptr, n);
        }
        const durationMs = performance.now() - start;
        deps.postMessageSafe({
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
      return true;
    }

    // ========== SORTING ==========
    case 'quicksort': {
      const view = new Float64Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      quicksort(view);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'quicksortDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'quicksortJs': {
      const view = new Float64Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      quicksortJS(view);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'quicksortJsDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'quicksortJsBench': {
      if (message.length > MAX_BUFFER_LENGTH) {
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }
      const arr = new Float64Array(message.length);
      const rng = makeRng(0x6d2b79f5 ^ message.length);
      for (let i = 0; i < message.length; i++) {
        arr[i] = rng();
      }
      const start = performance.now();
      quicksortJS(arr);
      const durationMs = performance.now() - start;
      deps.postMessageSafe({
        type: 'quicksortJsBenchDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        durationMs,
      });
      return true;
    }

    case 'quicksortWasmBench': {
      if (message.length > MAX_BUFFER_LENGTH) {
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }
      const wasm = await deps.ensureWasm();
      let buffer = null as null | { ptr: number; view: Float64Array };
      try {
        buffer = allocF64View(wasm, message.length);
        const rng = makeRng(0xdeadbeef ^ message.length);
        for (let i = 0; i < message.length; i++) {
          buffer.view[i] = rng();
        }
        const start = performance.now();
        wasm.quicksort_ptr(buffer.ptr, message.length);
        const durationMs = performance.now() - start;
        deps.postMessageSafe({
          type: 'quicksortWasmBenchDone',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          durationMs,
        });
      } finally {
        if (buffer) wasm.free_f64(buffer.ptr, message.length);
      }
      return true;
    }

    default:
      return false;
  }
};
