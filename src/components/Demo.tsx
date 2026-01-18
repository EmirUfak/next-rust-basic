'use client';

import { useSyncExternalStore, useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_BUFFER_LENGTH,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
} from '../workers/worker-messages';
import { WorkerPool } from '../workers/worker-pool';

// Constants
const MAX_MATRIX_SIZE = 1500;
const MAX_ARRAY_SIZE = 15_000_000;

export default function Demo() {
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const crossOriginIsolated = useSyncExternalStore(
    () => () => {},
    () => typeof window !== 'undefined' ? window.crossOriginIsolated : false,
    () => false
  );
  const poolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    // Debug info
    if (typeof window !== 'undefined') {
       console.log('SAB Support:', {
         crossOriginIsolated: window.crossOriginIsolated,
         isSecureContext: window.isSecureContext,
         origin: window.location.origin
       });
    }
  }, []);
  
  // Fibonacci State
  const [fibN, setFibN] = useState(35);
  const [fibIterations, setFibIterations] = useState(50);
  const [fibJsTime, setFibJsTime] = useState<number | null>(null);
  const [fibWasmTime, setFibWasmTime] = useState<number | null>(null);
  const [fibJsResult, setFibJsResult] = useState<number | null>(null);
  const [fibWasmResult, setFibWasmResult] = useState<number | null>(null);
  const [fibLoading, setFibLoading] = useState(false);
  
  // Matrix State
  const [matrixSize, setMatrixSize] = useState(300);
  const [matrixJsTime, setMatrixJsTime] = useState<number | null>(null);
  const [matrixWasmTime, setMatrixWasmTime] = useState<number | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  
  // Quicksort State
  const [sortSize, setSortSize] = useState(10_000_000);
  const [sortJsTime, setSortJsTime] = useState<number | null>(null);
  const [sortWasmTime, setSortWasmTime] = useState<number | null>(null);
  const [sortLoading, setSortLoading] = useState(false);
  
  // SharedArrayBuffer State
  const [sabTime, setSabTime] = useState<number | null>(null);
  const [sabLoading, setSabLoading] = useState(false);
  const [sabCompleted, setSabCompleted] = useState(false);
  
  const poolSize = useMemo(() => {
    if (typeof navigator === 'undefined') return 1;
    return Math.max(1, Math.min(4, navigator.hardwareConcurrency ?? 2));
  }, []);

  const createRequestId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };



  useEffect(() => {
    const pool = new WorkerPool(poolSize);
    poolRef.current = pool;

    pool
      .init(() => new Worker(new URL('../workers/wasm.worker.ts', import.meta.url), { type: 'module' }))
      .then(() => {
        setIsWorkerReady(true);
        // Trigger JIT Warmup for all workers
        for (let i = 0; i < poolSize; i++) {
          pool.request({
            type: 'warmup',
            requestId: `warmup-${i}`,
            version: WORKER_PROTOCOL_VERSION,
          }).catch(e => console.warn('Warmup failed', e));
        }
      })
      .catch((error) => {
        setWorkerError(error instanceof Error ? error.message : 'Worker init error');
      });

    return () => {
      poolRef.current?.terminate();
    };
  }, [poolSize]);

  const postRequest = (request: WorkerRequest) => {
    const pool = poolRef.current;
    if (!pool) {
      return Promise.reject(new Error('Worker pool is not initialized'));
    }
    return pool.request(request);
  };

  // ========== FIBONACCI (JS runs in worker too) ==========
  const runFibonacciComparison = async () => {
    if (!poolRef.current) return;
    setFibLoading(true);
    setWorkerError(null);

    try {
      // Run JS in worker
      const jsStart = performance.now();
      const jsMessage = await postRequest({
        type: 'fibonacciBatchJs',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        n: fibN,
        iterations: fibIterations,
      });

      const jsEnd = performance.now();
      if (jsMessage.type === 'fibonacciBatchJsResult') {
        setFibJsTime(jsEnd - jsStart);
        setFibJsResult(jsMessage.result);
      }

      // Run WASM in worker
      const wasmStart = performance.now();
      const wasmMessage = await postRequest({
        type: 'fibonacciBatch',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        n: fibN,
        iterations: fibIterations,
      });
      const wasmEnd = performance.now();
      if (wasmMessage.type === 'fibonacciBatchResult') {
        setFibWasmTime(wasmEnd - wasmStart);
        setFibWasmResult(wasmMessage.result);
      }
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
    setFibLoading(false);
  };

  // ========== MATRIX MULTIPLICATION (JS runs in worker) ==========
  const runMatrixComparison = async () => {
    if (!poolRef.current) return;
    setMatrixLoading(true);
    setWorkerError(null);

    const n = Math.min(matrixSize, MAX_MATRIX_SIZE);
    const size = n * n;
    
    const aBuffer = new SharedArrayBuffer(size * 8);
    const bBuffer = new SharedArrayBuffer(size * 8);
    const cBuffer = new SharedArrayBuffer(size * 8);
    const controlBuffer = new SharedArrayBuffer(4);
    
    const a = new Float64Array(aBuffer);
    const b = new Float64Array(bBuffer);
    const control = new Int32Array(controlBuffer);
    
    // Initialize matrices
    for (let i = 0; i < size; i++) {
      a[i] = Math.random();
      b[i] = Math.random();
    }

    try {
      // Run JS in worker
      Atomics.store(control, 0, 0);
      const jsStart = performance.now();
      await postRequest({
        type: 'matrixMultiplyJs',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        aBuffer,
        bBuffer,
        cBuffer,
        control: controlBuffer,
        n,
      });
      const jsEnd = performance.now();
      setMatrixJsTime(jsEnd - jsStart);

      // Run WASM in worker
      Atomics.store(control, 0, 0);
      const wasmStart = performance.now();
      await postRequest({
        type: 'matrixMultiply',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        aBuffer,
        bBuffer,
        cBuffer,
        control: controlBuffer,
        n,
      });
      const wasmEnd = performance.now();
      setMatrixWasmTime(wasmEnd - wasmStart);
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
    setMatrixLoading(false);
  };

  // ========== QUICKSORT (JS runs in worker) ==========
  const runSortComparison = async () => {
    if (!poolRef.current) return;
    setSortLoading(true);
    setWorkerError(null);

    const length = Math.min(sortSize, Math.min(MAX_ARRAY_SIZE, MAX_BUFFER_LENGTH));
    const buffer = new SharedArrayBuffer(length * 8);
    const controlBuffer = new SharedArrayBuffer(4);
    const arr = new Float64Array(buffer);
    const control = new Int32Array(controlBuffer);

    // Initialize with random data
    for (let i = 0; i < length; i++) {
      arr[i] = Math.random();
    }

    try {
      // Run JS in worker
      Atomics.store(control, 0, 0);
      const jsStart = performance.now();
      await postRequest({
        type: 'quicksortJs',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        buffer,
        control: controlBuffer,
        length,
      });
      const jsEnd = performance.now();
      setSortJsTime(jsEnd - jsStart);

      // Re-shuffle for WASM test
      for (let i = 0; i < length; i++) {
        arr[i] = Math.random();
      }

      // Run WASM in worker
      Atomics.store(control, 0, 0);
      const wasmStart = performance.now();
      await postRequest({
        type: 'quicksort',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        buffer,
        control: controlBuffer,
        length,
      });
      const wasmEnd = performance.now();
      setSortWasmTime(wasmEnd - wasmStart);
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
    setSortLoading(false);
  };

  // ========== SHARED ARRAY BUFFER ==========
  const runSharedBufferDemo = async () => {
    if (!poolRef.current) return;
    setSabLoading(true);
    setSabCompleted(false);
    setWorkerError(null);

    if (!crossOriginIsolated) {
      setWorkerError('SharedArrayBuffer requires COOP/COEP headers.');
      setSabLoading(false);
      return;
    }

    try {
      const length = 1000;
      const sab = new SharedArrayBuffer(length * 4);
      const controlBuffer = new SharedArrayBuffer(4);
      const control = new Int32Array(controlBuffer);
      const arr = new Uint32Array(sab);

      for (let i = 0; i < length; i++) {
        arr[i] = 20;
      }

      Atomics.store(control, 0, 0);
      const start = performance.now();
      
      await postRequest({
        type: 'sharedBufferProcess',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        buffer: sab,
        control: controlBuffer,
        length,
      });

      const end = performance.now();
      setSabTime(end - start);
      setSabCompleted(true);
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'SAB error');
    }
    setSabLoading(false);
  };

  const getSpeedup = (jsTime: number | null, wasmTime: number | null) => {
    if (!jsTime || !wasmTime || wasmTime === 0) return null;
    return jsTime / wasmTime;
  };

  const fibSpeedup = getSpeedup(fibJsTime, fibWasmTime);
  const matrixSpeedup = getSpeedup(matrixJsTime, matrixWasmTime);
  const sortSpeedup = getSpeedup(sortJsTime, sortWasmTime);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            Next.js + Rust (WASM) Template
            <a
              href="https://github.com/emirufak/next-rust-basic"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-800 text-white text-sm rounded-full hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
          </h1>
          <p className="text-gray-500">
            SharedArrayBuffer • Web Workers • Zero-Copy Transfer
          </p>
        </div>

        {/* Status */}
        <div className="flex justify-center gap-4 mb-6 text-sm">
          <span className="flex items-center gap-1">
            Workers: <span className="font-bold">{poolSize}</span>
          </span>
          <span className="flex items-center gap-1" suppressHydrationWarning>
            SAB: {crossOriginIsolated ? '✓' : '✗'}
          </span>
        </div>

        {/* Cards Grid - Fixed height cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Fibonacci Benchmark - Fixed Height */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-[360px] flex flex-col">
            <h2 className="text-xl font-bold text-blue-600 mb-1 flex items-center gap-2">
              <span className="text-2xl">🔢</span> Fibonacci Benchmark
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-500">N value</label>
                <input
                  type="number"
                  value={fibN}
                  onChange={(e) => setFibN(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Iterations</label>
                <input
                  type="number"
                  value={fibIterations}
                  onChange={(e) => setFibIterations(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800"
                />
              </div>
            </div>
            <button
              onClick={runFibonacciComparison}
              disabled={!isWorkerReady || fibLoading}
              className="w-full py-3 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all mb-4"
            >
              {fibLoading ? '⏳ Running...' : '⚡ Run Comparison'}
            </button>
            {/* Fixed Result Area */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-yellow-700 font-medium">JavaScript</div>
                  <div className="text-xl font-bold text-yellow-600">{fibJsResult ?? '-'}</div>
                  <div className="text-sm text-yellow-600">{fibJsTime?.toFixed(1) ?? '-'} ms</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-orange-700 font-medium">Rust (WASM)</div>
                  <div className="text-xl font-bold text-orange-600">{fibWasmResult ?? '-'}</div>
                  <div className="text-sm text-orange-600">{fibWasmTime?.toFixed(1) ?? '-'} ms</div>
                </div>
              </div>
              <div className="text-center text-green-600 font-medium h-6">
                {fibSpeedup && fibSpeedup > 1 ? `🚀 WASM is ${fibSpeedup.toFixed(1)}x faster!` : ''}
              </div>
            </div>
          </div>

          {/* Matrix Multiplication - Fixed Height */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-[360px] flex flex-col">
            <h2 className="text-xl font-bold text-red-500 mb-1 flex items-center gap-2">
              <span className="text-2xl">🧮</span> Matrix Multiplication
            </h2>
            <p className="text-sm text-gray-500 mb-3">O(n³) complexity - great for showing WASM advantage</p>
            <div className="mb-4">
              <label className="text-sm text-gray-500">Matrix Size (n×n) - max {MAX_MATRIX_SIZE}</label>
              <input
                type="number"
                value={matrixSize}
                max={MAX_MATRIX_SIZE}
                onChange={(e) => setMatrixSize(Math.min(Number(e.target.value), MAX_MATRIX_SIZE))}
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800"
              />
            </div>
            <button
              onClick={runMatrixComparison}
              disabled={!isWorkerReady || matrixLoading || !crossOriginIsolated}
              className="w-full py-3 bg-linear-to-r from-red-500 to-orange-500 text-white rounded-lg font-medium hover:from-red-600 hover:to-orange-600 disabled:opacity-50 transition-all mb-4"
            >
              {matrixLoading ? '⏳ Running...' : '⚡ Run Comparison'}
            </button>
            {/* Fixed Result Area */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-yellow-700 font-medium">JavaScript</div>
                  <div className="text-xl font-bold text-yellow-600">{matrixJsTime?.toFixed(1) ?? '-'} <span className="text-sm">ms</span></div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-orange-700 font-medium">Rust (WASM)</div>
                  <div className="text-xl font-bold text-orange-600">{matrixWasmTime?.toFixed(1) ?? '-'} <span className="text-sm">ms</span></div>
                </div>
              </div>
              <div className="text-center text-green-600 font-medium h-6">
                {matrixSpeedup && matrixSpeedup > 1 ? `🚀 WASM is ${matrixSpeedup.toFixed(1)}x faster!` : ''}
              </div>
            </div>
          </div>

          {/* Array Sorting - Fixed Height */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-[360px] flex flex-col">
            <h2 className="text-xl font-bold text-purple-600 mb-1 flex items-center gap-2">
              <span className="text-2xl">📊</span> Array Sorting (Quicksort)
            </h2>
            <p className="text-sm text-gray-500 mb-3">Sort large arrays of random numbers</p>
            <div className="mb-4">
              <label className="text-sm text-gray-500">Array Size - max {(MAX_ARRAY_SIZE / 1_000_000).toFixed(0)}M</label>
              <input
                type="number"
                value={sortSize}
                max={MAX_ARRAY_SIZE}
                onChange={(e) => setSortSize(Math.min(Number(e.target.value), MAX_ARRAY_SIZE))}
                className="w-full p-2 border rounded-lg bg-gray-50 text-gray-800"
              />
            </div>
            <button
              onClick={runSortComparison}
              disabled={!isWorkerReady || sortLoading || !crossOriginIsolated}
              className="w-full py-3 bg-linear-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 transition-all mb-4"
            >
              {sortLoading ? '⏳ Running...' : '⚡ Run Comparison'}
            </button>
            {/* Fixed Result Area */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-yellow-700 font-medium">JavaScript</div>
                  <div className="text-xl font-bold text-yellow-600">{sortJsTime?.toFixed(1) ?? '-'} <span className="text-sm">ms</span></div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-sm text-orange-700 font-medium">Rust (WASM)</div>
                  <div className="text-xl font-bold text-orange-600">{sortWasmTime?.toFixed(1) ?? '-'} <span className="text-sm">ms</span></div>
                </div>
              </div>
              <div className="text-center text-green-600 font-medium h-6">
                {sortSpeedup && sortSpeedup > 1 ? `🚀 WASM is ${sortSpeedup.toFixed(1)}x faster!` : ''}
              </div>
            </div>
          </div>

          {/* SharedArrayBuffer Demo - Fixed Height */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-[360px] flex flex-col">
            <h2 className="text-xl font-bold text-teal-600 mb-1 flex items-center gap-2">
              <span className="text-2xl">🔗</span> SharedArrayBuffer Demo
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              1000 × fibonacci(20) with zero-copy transfer & Atomics synchronization
            </p>
            <button
              onClick={runSharedBufferDemo}
              disabled={!isWorkerReady || sabLoading || !crossOriginIsolated}
              className="w-full py-3 bg-linear-to-r from-orange-400 to-red-500 text-white rounded-lg font-medium hover:from-orange-500 hover:to-red-600 disabled:opacity-50 transition-all mb-4"
            >
              {sabLoading ? '⏳ Running...' : '🔥 Run Batch'}
            </button>
            {/* Fixed Result Area */}
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-green-50 rounded-lg p-6 text-center w-full">
                {sabCompleted ? (
                  <>
                    <div className="text-green-600 font-medium mb-2">✓ Completed</div>
                    <div className="text-4xl font-bold text-green-700">{sabTime?.toFixed(1)} <span className="text-lg">ms</span></div>
                  </>
                ) : (
                  <div className="text-gray-400 py-4">Run benchmark to see results</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {workerError && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-center">
            ⚠️ {workerError}
          </div>
        )}
      </div>
    </div>
  );
}
