import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const wasmPath = join(process.cwd(), '.wasm', 'pkg', 'wasm_lib_bg.wasm');
const modulePath = '../../.wasm/pkg/wasm_lib.js';
const testIf = existsSync(wasmPath) ? test : test.skip;

describe('wasm_lib golden values', () => {
  testIf('computes fibonacci and sum correctly', async () => {
    const wasmBytes = readFileSync(wasmPath);
    const wasmModule = await import(modulePath);
    wasmModule.initSync(wasmBytes);

    expect(wasmModule.fibonacci(10)).toBe(55);
    expect(wasmModule.sum_u32(new Uint32Array([1, 2, 3, 4]))).toBe(10);
  });
});
