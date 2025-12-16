import { useEffect, useState } from 'react';
import init, { fibonacci } from '../../crates/wasm/pkg/wasm_lib';

let wasmInitPromise: Promise<any> | null = null;

export const useWasm = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!wasmInitPromise) {
      wasmInitPromise = init();
    }
    
    wasmInitPromise.then(() => {
      setIsReady(true);
    });
  }, []);

  return { isReady, fibonacci };
};
