import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const isShared = process.env.WASM_SHARED === '1' || process.env.WASM_SHARED === 'true';
const sharedRustFlags = [
  '-C',
  'target-feature=+atomics,+bulk-memory,+mutable-globals',
  '-C',
  'link-arg=--shared-memory',
  '-C',
  'link-arg=--max-memory=1073741824',
  '-Z',
  'unstable-options',
  '-C',
  'panic=immediate-abort',
].join(' ');

const run = (cmd, args, envOverrides = {}) => {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const supportsSharedMemory = () => {
  const result = spawnSync('wasm-bindgen', ['--help'], { encoding: 'utf8', shell: true });
  if (result.status !== 0) {
    return false;
  }
  return typeof result.stdout === 'string' && result.stdout.includes('--shared-memory');
};

const crateDir = join(process.cwd(), 'crates', 'wasm');
const outDir = join(process.cwd(), '.wasm', 'pkg');

const rustflags = isShared
  ? [process.env.RUSTFLAGS, sharedRustFlags].filter(Boolean).join(' ')
  : process.env.RUSTFLAGS;

const cargoArgs = [
  'build',
  '--release',
  '--target',
  'wasm32-unknown-unknown',
  '--manifest-path',
  join(crateDir, 'Cargo.toml'),
];

if (isShared) {
  cargoArgs.unshift('+nightly');
  cargoArgs.push('-Z', 'build-std=std,panic_abort');
}

run('cargo', cargoArgs, rustflags ? { RUSTFLAGS: rustflags } : {});

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

const bindgenArgs = [
  '--target',
  'web',
  '--out-dir',
  outDir,
  '--out-name',
  'wasm_lib',
];
if (isShared) {
  if (!supportsSharedMemory()) {
    console.error('[wasm] wasm-bindgen CLI does not support --shared-memory.');
    console.error('[wasm] Update CLI: cargo install -f wasm-bindgen-cli --version 0.2.108');
    process.exit(1);
  }
  bindgenArgs.push('--shared-memory');
}
bindgenArgs.push(wasmPath);
run('wasm-bindgen', bindgenArgs);

// Use npx to run wasm-opt from node_modules/.bin or system PATH
const hasWasmOpt = spawnSync('npx', ['wasm-opt', '--version'], { stdio: 'ignore', shell: true }).status === 0;
if (hasWasmOpt) {
  const wasmFile = join(outDir, 'wasm_lib_bg.wasm');
  const { statSync } = await import('node:fs');
  const sizeBefore = statSync(wasmFile).size;
  run('npx', ['wasm-opt', '-O3', '-o', wasmFile, wasmFile]);
  const sizeAfter = statSync(wasmFile).size;
  const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
  console.log(`[wasm-opt] ${(sizeBefore / 1024).toFixed(1)}KB -> ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% smaller)`);
} else {
  console.log('[wasm] wasm-opt not found, skipping optimization');
}

