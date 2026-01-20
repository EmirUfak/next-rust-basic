import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ensureStub = () => {
  const outDir = join(process.cwd(), '.wasm', 'pkg');
  mkdirSync(outDir, { recursive: true });

  const jsPath = join(outDir, 'wasm_lib.js');
  const dtsPath = join(outDir, 'wasm_lib.d.ts');

  const jsStub = `const stubError = () => {
  throw new Error('WASM module not built. Run: npm run build:wasm');
};

export default async function init() {
  return {
    memory: { buffer: new ArrayBuffer(0) },
    alloc_f64: stubError,
    free_f64: stubError,
    matrix_multiply_ptr: stubError,
    matrix_multiply_strassen_ptr: stubError,
    quicksort_ptr: stubError,
  };
}

export function fibonacci() {
  stubError();
}

export function fibonacci_iter() {
  stubError();
}

export function process_shared_buffer() {
  stubError();
}

export function sum_u32() {
  stubError();
}

export function sum_u32_sab() {
  stubError();
}

export function sum_f32_simd() {
  stubError();
}

export function dot_product_simd() {
  stubError();
}

export function grayscale() {
  stubError();
}

export function box_blur() {
  stubError();
}

export function fft_demo() {
  stubError();
}

export function generate_signal() {
  stubError();
}

export function matrix_multiply() {
  stubError();
}

export function matrix_multiply_strassen() {
  stubError();
}

export function quicksort() {
  stubError();
}
`;

  const dtsStub = `export default function init(): Promise<{
  memory: { buffer: ArrayBuffer };
  alloc_f64: (len: number) => number;
  free_f64: (ptr: number, len: number) => void;
  matrix_multiply_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  matrix_multiply_strassen_ptr: (aPtr: number, bPtr: number, cPtr: number, n: number) => void;
  quicksort_ptr: (ptr: number, len: number) => void;
}>;
export function fibonacci(n: number): number;
export function fibonacci_iter(n: number): bigint;
export function process_shared_buffer(arr: Uint32Array): void;
export function sum_u32(arr: Uint32Array): number;
export function sum_u32_sab(arr: Uint32Array): number;
export function sum_f32_simd(arr: Float32Array): number;
export function dot_product_simd(a: Float32Array, b: Float32Array): number;
export function grayscale(data: Uint8Array): void;
export function box_blur(data: Uint8Array, width: number, height: number, radius: number): void;
export function fft_demo(input: Float64Array, output: Float64Array): void;
export function generate_signal(buffer: Float64Array, freq1: number, freq2: number, freq3: number): void;
export function matrix_multiply(a: Float64Array, b: Float64Array, c: Float64Array, n: number): void;
export function matrix_multiply_strassen(a: Float64Array, b: Float64Array, c: Float64Array, n: number): void;
export function quicksort(arr: Float64Array): void;
`;

  writeFileSync(jsPath, jsStub, 'utf8');
  writeFileSync(dtsPath, dtsStub, 'utf8');
};

const skip = process.env.SKIP_WASM_BUILD === '1' || process.env.SKIP_WASM_BUILD === 'true';

if (skip) {
  console.log('[wasm] SKIP_WASM_BUILD is set. Skipping WASM build.');
  ensureStub();
  process.exit(0);
}

const hasCargo = spawnSync('cargo', ['--version'], { stdio: 'ignore', shell: true }).status === 0;
const hasWasmBindgen =
  spawnSync('wasm-bindgen', ['--version'], { stdio: 'ignore', shell: true }).status === 0;

if (!hasCargo || !hasWasmBindgen) {
  if (!hasCargo) {
    console.log('[wasm] Cargo not found. Skipping WASM build.');
  } else {
    console.log('[wasm] wasm-bindgen not found. Skipping WASM build.');
  }
  ensureStub();
  process.exit(0);
}

const useShared = process.env.WASM_SHARED === '1' || process.env.WASM_SHARED === 'true';
const buildScript = useShared ? 'build:wasm:shared' : 'build:wasm';
const result = spawnSync('npm', ['run', buildScript], { stdio: 'inherit', shell: true });

if (result.status !== 0) {
  console.error('[wasm] WASM build failed. You can retry with: npm run build:wasm');
  ensureStub();
  process.exit(result.status ?? 1);
}
