/// <reference lib="webworker" />
import init from '../../.wasm/pkg/wasm_lib';
import type { WasmExports } from './wasm/wasm-utils';
import { handleBenchMessage } from './wasm/handlers/bench';
import { handleSharedMessage } from './wasm/handlers/shared';
import { handleOpsMessage } from './wasm/handlers/ops';
import {
  isWorkerRequest,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-messages';

let isInitialized = false;
let wasmExports: WasmExports | null = null;
const sharedMemoryState = { value: null as { ptr: number; length: number } | null };
const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

// ============================================================================
// WORKER COMMUNICATION
// ============================================================================

const postMessageSafe = (message: WorkerResponse) => {
  self.postMessage(message);
};

const signalComplete = (control: Int32Array) => {
  Atomics.store(control, 0, 1);
  Atomics.notify(control, 0, 1);
};

const ensureWasm = async (): Promise<WasmExports> => {
  if (!isInitialized) {
    const exports = await init();
    wasmExports = exports as unknown as WasmExports;
    isInitialized = true;
  }
  if (!wasmExports) {
    throw new Error('WASM exports not available');
  }
  return wasmExports;
};

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const message = e.data;

  if (!isWorkerRequest(message)) {
    postMessageSafe({
      type: 'error',
      requestId: 'unknown',
      version: WORKER_PROTOCOL_VERSION,
      message: 'Invalid worker message',
    });
    return;
  }

  try {
    // Streaming WASM instantiation for faster startup
    await ensureWasm();

    if (message.type === 'ping') {
      postMessageSafe({
        type: 'ready',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return;
    }

    const deps = {
      postMessageSafe,
      signalComplete,
      ensureWasm,
      isPowerOfTwo,
    };

    if (await handleBenchMessage(message, deps)) {
      return;
    }

    if (await handleSharedMessage(message, { ...deps, sharedMemoryState })) {
      return;
    }

    if (await handleOpsMessage(message, deps)) {
      return;
    }

    postMessageSafe({
      type: 'error',
      requestId: message.requestId,
      version: WORKER_PROTOCOL_VERSION,
      message: `Unhandled message type: ${message.type}`,
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown worker error';
    postMessageSafe({
      type: 'error',
      requestId: message.requestId,
      version: WORKER_PROTOCOL_VERSION,
      message: messageText,
    });
  }
};
