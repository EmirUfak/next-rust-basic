import type { WorkerResponse } from '../../worker-messages';
import type { WasmExports } from '../wasm-utils';

export type HandlerDeps = {
  postMessageSafe: (message: WorkerResponse) => void;
  signalComplete: (control: Int32Array) => void;
  ensureWasm: () => Promise<WasmExports>;
  isPowerOfTwo: (n: number) => boolean;
};

export type SharedMemoryState = {
  value: { ptr: number; length: number } | null;
};
