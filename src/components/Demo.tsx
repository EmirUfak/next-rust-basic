'use client';

import { useEffect, useRef, useState } from 'react';
import { fibonacciJS } from '../lib/fibonacci';
import { useStore } from '../lib/store';
import { RenderCounter } from './RenderCounter';

export default function Demo() {
  const { rustResult, jsResult, rustTime, jsTime, setRustResult, setJsResult } = useStore();
  const [input, setInput] = useState(30);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
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
      const end = performance.now();
      setRustResult(e.data, end - start);
    };
  };

  return (
    <div className="flex flex-col items-center gap-8 p-8 w-full">
      <h1 className="text-3xl font-bold">Next.js + Rust (WASM) Boilerplate (next-rust-basic)</h1>
      
      <div className="flex gap-4 items-center">
        <label>Fibonacci N:</label>
        <input 
          type="number" 
          value={input} 
          onChange={(e) => setInput(Number(e.target.value))}
          className="p-2 border rounded text-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
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
      </div>

      <RenderCounter />
    </div>
  );
}
