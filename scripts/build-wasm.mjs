import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const crateDir = join(process.cwd(), 'crates', 'wasm');
const outDir = join(process.cwd(), '.wasm', 'pkg');

run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', join(crateDir, 'Cargo.toml')]);

const wasmPath = join(
  crateDir,
  'target',
  'wasm32-unknown-unknown',
  'release',
  'wasm_lib.wasm'
);

if (!existsSync(wasmPath)) {
  console.error('[wasm] Build output not found:', wasmPath);
  process.exit(1);
}

run('wasm-bindgen', [
  '--target',
  'web',
  '--out-dir',
  outDir,
  '--out-name',
  'wasm_lib',
  wasmPath,
]);

// Use npx to run wasm-opt from node_modules/.bin or system PATH
const hasWasmOpt = spawnSync('npx', ['wasm-opt', '--version'], { stdio: 'ignore', shell: true }).status === 0;
if (hasWasmOpt) {
  const wasmFile = join(outDir, 'wasm_lib_bg.wasm');
  const { statSync } = await import('node:fs');
  const sizeBefore = statSync(wasmFile).size;
  run('npx', ['wasm-opt', '-O3', '-o', wasmFile, wasmFile]);
  const sizeAfter = statSync(wasmFile).size;
  const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
  console.log(`[wasm-opt] ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% smaller)`);
} else {
  console.log('[wasm] wasm-opt not found, skipping optimization');
}

