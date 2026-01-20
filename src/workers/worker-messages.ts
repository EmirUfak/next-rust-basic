export const WORKER_PROTOCOL_VERSION = 1 as const;
export const MAX_BUFFER_LENGTH = 10_000_000;
export const MAX_IMAGE_SIZE = 16_000_000; // 4K x 4K x 4 channels
export const MAX_MATRIX_SIZE = 1500;

// ============================================================================
// REQUEST TYPES
// ============================================================================

export type WorkerRequest =
  | { type: 'ping'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'warmup'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  // Fibonacci
  | { type: 'fibonacci'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number }
  | { type: 'fibonacciIter'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number }
  | { type: 'fibonacciBatch'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number; iterations: number }
  | { type: 'fibonacciBatchJs'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number; iterations: number }
  | { type: 'fibonacciIterBatch'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number; iterations: number }
  // SharedArrayBuffer
  | { type: 'sharedBufferProcess'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  // Array operations
  | { type: 'sumArray'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; data: Uint32Array }
  | { type: 'sumArraySab'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  // SIMD operations
  | { type: 'dotProductSimd'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; aBuffer: SharedArrayBuffer; bBuffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  | { type: 'sumF32Simd'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  // Image processing
  | { type: 'grayscale'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  | { type: 'boxBlur'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; width: number; height: number; radius: number }
  // FFT
  | { type: 'fftDemo'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; inputBuffer: SharedArrayBuffer; outputBuffer: SharedArrayBuffer; control: SharedArrayBuffer; size: number }
  | { type: 'generateSignal'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; size: number; freq1: number; freq2: number; freq3: number }
  // Matrix operations
  | { type: 'matrixMultiply'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; aBuffer: SharedArrayBuffer; bBuffer: SharedArrayBuffer; cBuffer: SharedArrayBuffer; control: SharedArrayBuffer; n: number }
  | { type: 'matrixMultiplyJs'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; aBuffer: SharedArrayBuffer; bBuffer: SharedArrayBuffer; cBuffer: SharedArrayBuffer; control: SharedArrayBuffer; n: number }
  | { type: 'matrixMultiplyStrassen'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; aBuffer: SharedArrayBuffer; bBuffer: SharedArrayBuffer; cBuffer: SharedArrayBuffer; control: SharedArrayBuffer; n: number }
  | { type: 'matrixMultiplyJsBench'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number }
  | { type: 'matrixMultiplyWasmBench'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; n: number; algorithm: 'naive' | 'strassen' }
  // Sorting
  | { type: 'quicksort'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  | { type: 'quicksortJs'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; buffer: SharedArrayBuffer; control: SharedArrayBuffer; length: number }
  | { type: 'quicksortJsBench'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; length: number }
  | { type: 'quicksortWasmBench'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; length: number };

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export type WorkerResponse =
  | { type: 'warmup'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'ready'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'warmupDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'error'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; message: string }
  // Fibonacci results
  | { type: 'fibonacciResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number }
  | { type: 'fibonacciIterResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: bigint }
  | { type: 'fibonacciBatchResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number; iterations: number }
  | { type: 'fibonacciBatchJsResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number; iterations: number }
  | { type: 'fibonacciIterBatchResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: bigint; iterations: number }
  // SharedArrayBuffer results
  | { type: 'sharedBufferDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; durationMs: number }
  // Array results
  | { type: 'sumArrayResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number }
  | { type: 'sumArraySabResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number }
  // SIMD results
  | { type: 'dotProductSimdResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number }
  | { type: 'sumF32SimdResult'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; result: number }
  // Image processing results
  | { type: 'grayscaleDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'boxBlurDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  // FFT results
  | { type: 'fftDemoDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'generateSignalDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  // Matrix results
  | { type: 'matrixMultiplyDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'matrixMultiplyJsDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'matrixMultiplyStrassenDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'matrixMultiplyJsBenchDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; durationMs: number }
  | { type: 'matrixMultiplyWasmBenchDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; durationMs: number; algorithmUsed: 'naive' | 'strassen' }
  // Sorting results
  | { type: 'quicksortDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'quicksortJsDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION }
  | { type: 'quicksortJsBenchDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; durationMs: number }
  | { type: 'quicksortWasmBenchDone'; requestId: string; version: typeof WORKER_PROTOCOL_VERSION; durationMs: number };

// ============================================================================
// TYPE GUARDS
// ============================================================================

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const validRequestTypes = new Set([
  'ping', 'warmup', 'fibonacci', 'fibonacciIter', 'fibonacciBatch', 'fibonacciBatchJs', 'fibonacciIterBatch',
  'sharedBufferProcess', 'sumArray', 'sumArraySab', 'dotProductSimd', 'sumF32Simd',
  'grayscale', 'boxBlur', 'fftDemo', 'generateSignal',
  'matrixMultiply', 'matrixMultiplyJs', 'matrixMultiplyStrassen', 'matrixMultiplyJsBench', 'matrixMultiplyWasmBench',
  'quicksort', 'quicksortJs', 'quicksortJsBench', 'quicksortWasmBench'
]);

export const isWorkerRequest = (value: unknown): value is WorkerRequest => {
  if (!isRecord(value) || value.version !== WORKER_PROTOCOL_VERSION) return false;
  if (typeof value.requestId !== 'string') return false;
  if (typeof value.type !== 'string' || !validRequestTypes.has(value.type)) return false;
  return true;
};

const validResponseTypes = new Set([
  'ready', 'warmupDone', 'error',
  'fibonacciResult', 'fibonacciIterResult', 'fibonacciBatchResult', 'fibonacciBatchJsResult', 'fibonacciIterBatchResult',
  'sharedBufferDone', 'sumArrayResult', 'sumArraySabResult',
  'dotProductSimdResult', 'sumF32SimdResult',
  'grayscaleDone', 'boxBlurDone', 'fftDemoDone', 'generateSignalDone',
  'matrixMultiplyDone', 'matrixMultiplyJsDone', 'matrixMultiplyStrassenDone', 'matrixMultiplyJsBenchDone', 'matrixMultiplyWasmBenchDone',
  'quicksortDone', 'quicksortJsDone', 'quicksortJsBenchDone', 'quicksortWasmBenchDone'
]);

export const isWorkerResponse = (value: unknown): value is WorkerResponse => {
  if (!isRecord(value) || value.version !== WORKER_PROTOCOL_VERSION) return false;
  if (typeof value.requestId !== 'string') return false;
  if (typeof value.type !== 'string' || !validResponseTypes.has(value.type)) return false;
  return true;
};
