/// <reference lib="webworker" />
import init, { fibonacci } from '../../crates/wasm/pkg/wasm_lib';

let isInitialized = false;

self.onmessage = async (e: MessageEvent<number>) => {
  if (!isInitialized) {
    await init();
    isInitialized = true;
  }
  
  const result = fibonacci(e.data);
  self.postMessage(result);
};
