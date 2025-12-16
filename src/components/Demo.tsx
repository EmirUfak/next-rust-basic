'use client';

import { useEffect, useRef, useState } from 'react';
import { fibonacciJS } from '../lib/fibonacci';
import { useStore } from '../lib/store';

export default function Demo() {
  const { rustResult, jsResult, rustTime, jsTime, setRustResult, setJsResult } = useStore();
  const [input, setInput] = useState(30);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [sharedBufferTime, setSharedBufferTime] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/fibonacci.worker.ts', import.meta.url));
    setIsWorkerReady(true);

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const runJs = () => {
    const start = performance.now();
    const res = fibonacciJS(input);
    const end = performance.now();
    setJsResult(res, end - start);
  };

  const runRust = () => {
    if (!workerRef.current) return;
    
    setRustResult(0, 0); // Reset or show loading state if needed
    const start = performance.now();
    
    workerRef.current.postMessage(input);
    
    workerRef.current.onmessage = (e) => {
      if (typeof e.data === 'number') {
        const end = performance.now();
        setRustResult(e.data, end - start);
      }
    };
  };

  const runSharedBuffer = () => {
    if (!workerRef.current) return;
    
    // Create a SharedArrayBuffer
    // Note: This requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
    try {
      const length = 1000;
      const sab = new SharedArrayBuffer(length * 4); // 4 bytes per u32
      const arr = new Uint32Array(sab);
      
      // Fill with some data (e.g., all 20s)
      for (let i = 0; i < length; i++) {
        arr[i] = 20;
      }

      const start = performance.now();
      workerRef.current.postMessage(arr);
      
      workerRef.current.onmessage = (e) => {
        if (e.data === 'DONE') {
          const end = performance.now();
          setSharedBufferTime(end - start);
          console.log('First 5 results from shared buffer:', arr.slice(0, 5));
        } else if (typeof e.data === 'number') {
           // Handle legacy single number response if mixed
           const end = performance.now();
           setRustResult(e.data, end - start);
        }
      };
    } catch (e) {
      console.error("SharedArrayBuffer error:", e);
      alert("SharedArrayBuffer is not supported or headers are missing. Check console.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 w-full">
      <h1 className="text-3xl font-bold">Next.js + Rust (WASM) Template (next-rust-basic)</h1>
      
      <div className="flex gap-4 items-center">
        <label>Fibonacci N:</label>
        <input 
          type="number" 
          value={input} 
          onChange={(e) => setInput(Number(e.target.value))}
          className="p-2 border rounded text-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* JS Section */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-yellow-600">JavaScript (Main Thread)</h2>
          <button 
            onClick={runJs}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded text-white mb-4 transition-colors shadow-sm"
          >
            Run JS Calculation
          </button>
          {jsResult !== null && (
            <div className="space-y-2">
              <p className="text-lg text-gray-800">Result: <span className="font-mono font-bold">{jsResult}</span></p>
              <p className="text-sm text-gray-500">Time: <span className="text-gray-900 font-bold">{jsTime?.toFixed(4)}</span> ms</p>
            </div>
          )}
        </div>

        {/* Rust Section */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-orange-600">Rust (Web Worker)</h2>
          <button 
            onClick={runRust}
            disabled={!isWorkerReady}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded text-white mb-4 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isWorkerReady ? 'Run Rust Calculation' : 'Loading Worker...'}
          </button>
          {rustResult !== null && (
            <div className="space-y-2">
              <p className="text-lg text-gray-800">Result: <span className="font-mono font-bold">{rustResult}</span></p>
              <p className="text-sm text-gray-500">Time: <span className="text-gray-900 font-bold">{rustTime?.toFixed(4)}</span> ms</p>
            </div>
          )}
        </div>

        {/* Shared Buffer Section */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-purple-600">Shared Memory</h2>
          <p className="text-sm text-gray-600 mb-4">Process 1000 items in-place using SharedArrayBuffer (Zero-Copy)</p>
          <button 
            onClick={runSharedBuffer}
            disabled={!isWorkerReady}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded text-white mb-4 disabled:opacity-50 transition-colors shadow-sm"
          >
            Run Batch Process
          </button>
          {sharedBufferTime !== null && (
            <div className="space-y-2">
              <p className="text-lg text-gray-800">Status: <span className="font-bold text-green-600">Done</span></p>
              <p className="text-sm text-gray-500">Time: <span className="text-gray-900 font-bold">{sharedBufferTime?.toFixed(4)}</span> ms</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
