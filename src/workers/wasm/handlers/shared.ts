import { process_shared_buffer } from '../../../../.wasm/pkg/wasm_lib';
import {
  MAX_BUFFER_LENGTH,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
} from '../../worker-messages';
import type { HandlerDeps, SharedMemoryState } from './types';

export const handleSharedMessage = async (
  message: WorkerRequest,
  deps: HandlerDeps & { sharedMemoryState: SharedMemoryState }
): Promise<boolean> => {
  switch (message.type) {
    case 'sharedMemoryInit': {
      if (message.length > MAX_BUFFER_LENGTH) {
        deps.postMessageSafe({
          type: 'sharedMemoryReady',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          available: false,
        });
        return true;
      }

      const wasm = await deps.ensureWasm();
      const buffer = wasm.memory.buffer;
      if (typeof SharedArrayBuffer === 'undefined' || !(buffer instanceof SharedArrayBuffer)) {
        deps.postMessageSafe({
          type: 'sharedMemoryReady',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          available: false,
        });
        return true;
      }
      const sharedBuffer = buffer;

      if (deps.sharedMemoryState.value && deps.sharedMemoryState.value.length !== message.length) {
        wasm.free_u32(deps.sharedMemoryState.value.ptr, deps.sharedMemoryState.value.length);
        deps.sharedMemoryState.value = null;
      }

      if (!deps.sharedMemoryState.value) {
        const ptr = wasm.alloc_u32(message.length);
        if (!ptr) {
          throw new Error('WASM alloc failed');
        }
        deps.sharedMemoryState.value = { ptr, length: message.length };
      }

      deps.postMessageSafe({
        type: 'sharedMemoryReady',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        available: true,
        buffer: sharedBuffer,
        ptr: deps.sharedMemoryState.value.ptr,
        length: deps.sharedMemoryState.value.length,
      });
      return true;
    }

    case 'sharedMemoryProcess': {
      if (message.length > MAX_BUFFER_LENGTH) {
        const control = new Int32Array(message.control);
        deps.signalComplete(control);
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Shared buffer length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }

      const wasm = await deps.ensureWasm();
      const control = new Int32Array(message.control);
      const start = performance.now();
      wasm.process_shared_buffer_ptr(message.ptr, message.length);
      const durationMs = performance.now() - start;
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'sharedMemoryProcessDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        durationMs,
      });
      return true;
    }

    case 'sharedBufferProcess': {
      if (message.length > MAX_BUFFER_LENGTH) {
        const control = new Int32Array(message.control);
        deps.signalComplete(control);
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Shared buffer length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }

      const view = new Uint32Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      const start = performance.now();
      process_shared_buffer(view);
      const durationMs = performance.now() - start;
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'sharedBufferDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        durationMs,
      });
      return true;
    }

    default:
      return false;
  }
};
