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
  '-C',
  'link-arg=--import-memory',
  '-C',
  'link-arg=--export=__wasm_init_tls',
  '-C',
  'link-arg=--export=__tls_base',
  '-C',
  'link-arg=--export=__tls_size',
  '-C',
  'link-arg=--export=__tls_align',
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
bindgenArgs.push(wasmPath);
run('wasm-bindgen', bindgenArgs);

// Use npx to run wasm-opt from node_modules/.bin or system PATH
const hasWasmOpt = spawnSync('npx', ['wasm-opt', '--version'], { stdio: 'ignore', shell: true }).status === 0;
if (hasWasmOpt) {
  const wasmFile = join(outDir, 'wasm_lib_bg.wasm');
  const { statSync } = await import('node:fs');
  const sizeBefore = statSync(wasmFile).size;
  const wasmOptLevelEnv = (process.env.WASM_OPT_LEVEL || '').trim();
  const wasmOptLevel = wasmOptLevelEnv
    ? (wasmOptLevelEnv.startsWith('-O')
      ? wasmOptLevelEnv
      : (wasmOptLevelEnv.startsWith('O') ? `-${wasmOptLevelEnv}` : `-O${wasmOptLevelEnv}`))
    : '-O3';
  const fastMath = process.env.WASM_OPT_FAST_MATH === '1' || process.env.WASM_OPT_FAST_MATH === 'true';
  const wasmOptArgs = ['wasm-opt', wasmOptLevel];
  if (fastMath) {
    wasmOptArgs.push('--fast-math');
  }
  wasmOptArgs.push('-o', wasmFile, wasmFile);
  run('npx', wasmOptArgs);
  const sizeAfter = statSync(wasmFile).size;
  const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
  console.log(`[wasm-opt] ${(sizeBefore / 1024).toFixed(1)}KB -> ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% smaller)`);
} else {
  console.log('[wasm] wasm-opt not found, skipping optimization');
}

