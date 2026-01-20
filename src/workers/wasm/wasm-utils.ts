import {
  get_strassen_threshold,
  set_strassen_threshold,
} from '../../../.wasm/pkg/wasm_lib';

export type WasmExports = {
  memory: WebAssembly.Memory;
  alloc_f64: (len: number) => number;
  free_f64: (ptr: number, len: number) => void;
  alloc_u32: (len: number) => number;
  free_u32: (ptr: number, len: number) => void;
  process_shared_buffer_ptr: (ptr: number, len: number) => void;
  matrix_multiply_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  matrix_multiply_strassen_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  quicksort_ptr: (ptr: number, len: number) => void;
};

const STRASSEN_DEFAULT_THRESHOLD = 128;
let strassenThresholdTuned = false;

export const makeRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const getStrassenThresholdSafe = () => {
  try {
    return get_strassen_threshold();
  } catch {
    return STRASSEN_DEFAULT_THRESHOLD;
  }
};

export const allocF64View = (wasm: WasmExports, len: number) => {
  const ptr = wasm.alloc_f64(len);
  if (!ptr) {
    throw new Error('WASM alloc failed');
  }
  const view = new Float64Array(wasm.memory.buffer, ptr, len);
  return { ptr, view };
};

export const tuneStrassenThreshold = async (wasm: WasmExports) => {
  if (strassenThresholdTuned) return;
  strassenThresholdTuned = true;
  const n = 256;
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
    const rng = makeRng(0x9e3779b9);
    for (let i = 0; i < size; i++) {
      a.view[i] = rng();
      b.view[i] = rng();
    }
    const candidates = [128, 160, 192, 256];
    let bestThreshold = candidates[0];
    let bestTime = Number.POSITIVE_INFINITY;
    for (const threshold of candidates) {
      set_strassen_threshold(threshold);
      const start = performance.now();
      wasm.matrix_multiply_strassen_ptr(a.ptr, b.ptr, c.ptr, n);
      const durationMs = performance.now() - start;
      if (durationMs < bestTime) {
        bestTime = durationMs;
        bestThreshold = threshold;
      }
    }
    set_strassen_threshold(bestThreshold);
  } catch (error) {
    console.warn('Strassen threshold tuning skipped:', error);
  } finally {
    if (a) wasm.free_f64(a.ptr, size);
    if (b) wasm.free_f64(b.ptr, size);
    if (c) wasm.free_f64(c.ptr, size);
  }
};
