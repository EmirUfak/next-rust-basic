import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const wasmPath = join(process.cwd(), '.wasm', 'pkg', 'wasm_lib_bg.wasm');
const modulePath = '../../.wasm/pkg/wasm_lib.js';
const testIf = existsSync(wasmPath) ? test : test.skip;

describe('wasm_lib golden values', () => {
  testIf('fibonacci recursive - computes correct values', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    expect(wasmModule.fibonacci(0)).toBe(0);
    expect(wasmModule.fibonacci(1)).toBe(1);
    expect(wasmModule.fibonacci(10)).toBe(55);
  });

  testIf('fibonacci iterative - computes correct values', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    expect(wasmModule.fibonacci_iter(0)).toBe(0n);
    expect(wasmModule.fibonacci_iter(1)).toBe(1n);
    expect(wasmModule.fibonacci_iter(10)).toBe(55n);
    expect(wasmModule.fibonacci_iter(50)).toBe(12586269025n);
  });

  testIf('sum_u32 - computes correct sum', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    expect(wasmModule.sum_u32(new Uint32Array([1, 2, 3, 4]))).toBe(10);
    expect(wasmModule.sum_u32(new Uint32Array([]))).toBe(0);
  });

  testIf('SIMD sum_f32 - computes correct sum with unrolling', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    const arr = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0]);
    expect(wasmModule.sum_f32_simd(arr)).toBeCloseTo(15.0, 5);
  });

  testIf('SIMD dot_product - computes correct dot product', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    const a = new Float32Array([1.0, 2.0, 3.0, 4.0]);
    const b = new Float32Array([5.0, 6.0, 7.0, 8.0]);
    // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
    expect(wasmModule.dot_product_simd(a, b)).toBeCloseTo(70.0, 5);
  });

  testIf('matrix_multiply - computes correct multiplication', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    // 2x2 identity matrix test
    const a = new Float64Array([1, 0, 0, 1]);
    const b = new Float64Array([1, 2, 3, 4]);
    const c = new Float64Array(4);
    wasmModule.matrix_multiply(a, b, c, 2);
    expect(Array.from(c)).toEqual([1, 2, 3, 4]);
  });

  testIf('quicksort - sorts correctly', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    const arr = new Float64Array([5, 2, 8, 1, 9]);
    wasmModule.quicksort(arr);
    expect(Array.from(arr)).toEqual([1, 2, 5, 8, 9]);
  });
});
