import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ensureStub = () => {
  const outDir = join(process.cwd(), '.wasm', 'pkg');
  mkdirSync(outDir, { recursive: true });

  const jsPath = join(outDir, 'wasm_lib.js');
  const dtsPath = join(outDir, 'wasm_lib.d.ts');

  const jsStub = `export default async function init() {
  return {};
}

export function fibonacci() {
  throw new Error('WASM module not built. Run: npm run build:wasm');
}

export function process_shared_buffer() {
  throw new Error('WASM module not built. Run: npm run build:wasm');
}

export function sum_u32() {
  throw new Error('WASM module not built. Run: npm run build:wasm');
}
`;

  const dtsStub = `export default function init(): Promise<void>;
export function fibonacci(n: number): number;
export function process_shared_buffer(arr: Uint32Array): void;
export function sum_u32(arr: Uint32Array): number;
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

const result = spawnSync('npm', ['run', 'build:wasm'], { stdio: 'inherit', shell: true });

if (result.status !== 0) {
  console.error('[wasm] WASM build failed. You can retry with: npm run build:wasm');
  ensureStub();
  process.exit(result.status ?? 1);
}
