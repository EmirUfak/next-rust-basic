/// <reference lib="webworker" />
import init, { fibonacci, process_shared_buffer } from '../../crates/wasm/pkg/wasm_lib';

let isInitialized = false;

self.onmessage = async (e: MessageEvent) => {
  if (!isInitialized) {
    await init();
    isInitialized = true;
  }
  
  const data = e.data;

  // Check if data is a SharedArrayBuffer (or a view of it)
  if (data instanceof Uint32Array) {
    // Process the shared buffer directly
    // Note: In a real scenario with SharedArrayBuffer, we might need Atomics for synchronization
    // but for this demo we assume the main thread waits for us to post a message back.
    process_shared_buffer(data);
    self.postMessage('DONE'); // Signal completion
  } else if (typeof data === 'number') {
    // Legacy single number mode
    const result = fibonacci(data);
    self.postMessage(result);
  }
};
