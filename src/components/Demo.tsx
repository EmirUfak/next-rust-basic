'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fibonacciJS } from '../lib/fibonacci';
import { log, measure } from '../lib/logger';
import { useStore } from '../lib/store';
import {
  MAX_BUFFER_LENGTH,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
} from '../workers/worker-messages';
import { WorkerPool } from '../workers/worker-pool';

export default function Demo() {
  const { rustResult, jsResult, rustTime, jsTime, setRustResult, setJsResult } = useStore();
  const [input, setInput] = useState(30);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [sharedBufferTime, setSharedBufferTime] = useState<number | null>(null);
  const [sumResult, setSumResult] = useState<number | null>(null);
  const [sumTime, setSumTime] = useState<number | null>(null);
  const [sumSize, setSumSize] = useState(200_000);
  const [streamSum, setStreamSum] = useState<number | null>(null);
  const [streamTime, setStreamTime] = useState<number | null>(null);
  const [streamSize, setStreamSize] = useState(500_000);
  const [streamChunkSize, setStreamChunkSize] = useState(50_000);
  const [batchIterations, setBatchIterations] = useState(50);
  const [batchJsTime, setBatchJsTime] = useState<number | null>(null);
  const [batchWasmTime, setBatchWasmTime] = useState<number | null>(null);
  const [batchResult, setBatchResult] = useState<number | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [crossOriginIsolated, setCrossOriginIsolated] = useState<boolean | null>(null);
  const poolRef = useRef<WorkerPool | null>(null);
  const poolSize = useMemo(() => {
    if (typeof navigator === 'undefined') return 1;
    return Math.max(1, Math.min(4, navigator.hardwareConcurrency ?? 2));
  }, []);

  function createRequestId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  useEffect(() => {
    setCrossOriginIsolated(
      typeof window !== 'undefined' ? window.crossOriginIsolated : false
    );
  }, []);

  useEffect(() => {
    const pool = new WorkerPool(poolSize);
    poolRef.current = pool;

    pool
      .init(() => new Worker(new URL('../workers/fibonacci.worker.ts', import.meta.url), { type: 'module' }))
      .then(() => setIsWorkerReady(true))
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

  const runJs = () => {
    const stopMeasure = measure('js-fibonacci');
    const start = performance.now();
    const res = fibonacciJS(input);
    const end = performance.now();
    stopMeasure();
    setJsResult(res, end - start);
    log('info', 'JS fibonacci computed', { input, duration: end - start });
  };

  const runJsBatch = () => {
    const iterations = Math.max(1, Math.floor(batchIterations));
    const stopMeasure = measure('js-fibonacci-batch');
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < iterations; i += 1) {
      result = fibonacciJS(input);
    }
    const end = performance.now();
    stopMeasure();
    setBatchResult(result);
    setBatchJsTime(end - start);
    log('info', 'JS fibonacci batch', { input, iterations, duration: end - start });
  };

  const runRust = async () => {
    if (!poolRef.current) return;

    setWorkerError(null);
    setRustResult(0, 0);
    const start = performance.now();
    const requestId = createRequestId();
    const stopMeasure = measure('wasm-fibonacci');

    try {
      const message = await postRequest({
        type: 'fibonacci',
        requestId,
        version: WORKER_PROTOCOL_VERSION,
        n: input,
      });

      if (message.type === 'fibonacciResult') {
        const end = performance.now();
        stopMeasure();
        setRustResult(message.result, end - start);
        log('info', 'WASM fibonacci computed', { input, duration: end - start });
      }
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
  };

  const runRustBatch = async () => {
    if (!poolRef.current) return;

    setWorkerError(null);
    const iterations = Math.max(1, Math.floor(batchIterations));
    const start = performance.now();
    const requestId = createRequestId();
    const stopMeasure = measure('wasm-fibonacci-batch');

    try {
      const message = await postRequest({
        type: 'fibonacciBatch',
        requestId,
        version: WORKER_PROTOCOL_VERSION,
        n: input,
        iterations,
      });

      if (message.type === 'fibonacciBatchResult') {
        const end = performance.now();
        stopMeasure();
        setBatchResult(message.result);
        setBatchWasmTime(end - start);
        log('info', 'WASM fibonacci batch', { input, iterations, duration: end - start });
      }
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
  };

  const runSharedBuffer = async () => {
    if (!poolRef.current) return;

    setWorkerError(null);

    if (!crossOriginIsolated) {
      setWorkerError('SharedArrayBuffer requires COOP/COEP headers in production.');
      return;
    }

    // Create a SharedArrayBuffer
    // Note: This requires Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers
    try {
      const length = 1000;
      if (length > MAX_BUFFER_LENGTH) {
        throw new Error(`Shared buffer length exceeds limit (${MAX_BUFFER_LENGTH}).`);
      }
      const sab = new SharedArrayBuffer(length * 4); // 4 bytes per u32
      const controlBuffer = new SharedArrayBuffer(4);
      const control = new Int32Array(controlBuffer);
      Atomics.store(control, 0, 0);
      const arr = new Uint32Array(sab);

      // Fill with some data (e.g., all 20s)
      for (let i = 0; i < length; i++) {
        arr[i] = 20;
      }

      const stopMeasure = measure('wasm-shared-buffer');
      const start = performance.now();
      const requestId = createRequestId();
      const message = await postRequest({
        type: 'sharedBufferProcess',
        requestId,
        version: WORKER_PROTOCOL_VERSION,
        buffer: sab,
        control: controlBuffer,
        length,
      });

      if (message.type === 'sharedBufferDone') {
        const waitAsync = (Atomics as { waitAsync?: typeof Atomics.waitAsync }).waitAsync;
        if (typeof waitAsync === 'function') {
          await waitAsync(control, 0, 0).value;
        } else {
          await new Promise<void>((resolve) => {
            const handle = setInterval(() => {
              if (Atomics.load(control, 0) === 1) {
                clearInterval(handle);
                resolve();
              }
            }, 5);
          });
        }
        const end = performance.now();
        stopMeasure();
        setSharedBufferTime(end - start);
        log('info', 'Shared buffer processed', {
          duration: end - start,
          preview: Array.from(arr.slice(0, 5)),
        });
      }
    } catch (error) {
      log('error', 'SharedArrayBuffer error', error);
      setWorkerError(
        error instanceof Error
          ? error.message
          : 'SharedArrayBuffer is not supported or headers are missing.'
      );
    }
  };

  const runSumArray = async () => {
    if (!poolRef.current) return;

    setWorkerError(null);
    setSumResult(null);
    setSumTime(null);

    const length = Math.max(1, Math.floor(sumSize));
    if (length > MAX_BUFFER_LENGTH) {
      setWorkerError(`Array length exceeds limit (${MAX_BUFFER_LENGTH}).`);
      return;
    }
    const data = new Uint32Array(length);
    data.fill(20);

    const stopMeasure = measure('wasm-sum-array');
    const start = performance.now();
    const requestId = createRequestId();

    try {
      const message = await postRequest({
        type: 'sumArray',
        requestId,
        version: WORKER_PROTOCOL_VERSION,
        data,
      });

      if (message.type === 'sumArrayResult') {
        const end = performance.now();
        stopMeasure();
        setSumResult(message.result);
        setSumTime(end - start);
        log('info', 'WASM sum array computed', { length, duration: end - start });
      }
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : 'Worker error');
    }
  };

  const runStreamedSum = async () => {
    if (!poolRef.current) return;

    setWorkerError(null);
    setStreamSum(null);
    setStreamTime(null);

    const totalSize = Math.max(1, Math.floor(streamSize));
    const chunkSize = Math.max(1, Math.floor(streamChunkSize));

    const stream = new ReadableStream<Uint32Array>({
      start(controller) {
        let produced = 0;

        const push = () => {
          if (produced >= totalSize) {
            controller.close();
            return;
          }

          const current = Math.min(chunkSize, totalSize - produced);
          const chunk = new Uint32Array(current);
          chunk.fill(20);
          produced += current;
          controller.enqueue(chunk);
          queueMicrotask(push);
        };

        push();
      },
    });

    let sum = 0;
    const stopMeasure = measure('wasm-streamed-sum');
    const start = performance.now();

    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      if (!value) continue;

      if (value.length > MAX_BUFFER_LENGTH) {
        setWorkerError(`Chunk length exceeds limit (${MAX_BUFFER_LENGTH}).`);
        return;
      }

      const message = await postRequest({
        type: 'sumArray',
        requestId: createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
        data: value,
      });

      if (message.type === 'sumArrayResult') {
        sum += message.result;
      }
    }

    const end = performance.now();
    stopMeasure();
    setStreamSum(sum);
    setStreamTime(end - start);
    log('info', 'Streamed sum completed', { totalSize, chunkSize, duration: end - start });
  };

  const showSabWarning = crossOriginIsolated === false;

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 w-full max-w-6xl">
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

        {/* Batch Benchmark */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-slate-600">Batch Benchmark</h2>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-sm text-gray-600">Iterations:</label>
            <input
              type="number"
              min={1}
              value={batchIterations}
              onChange={(e) => setBatchIterations(Number(e.target.value))}
              className="p-2 border rounded text-black w-32"
            />
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={runJsBatch}
              className="px-4 py-2 bg-slate-500 hover:bg-slate-600 rounded text-white transition-colors shadow-sm"
            >
              Run JS Batch
            </button>
            <button
              onClick={runRustBatch}
              disabled={!isWorkerReady}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 rounded text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {isWorkerReady ? 'Run WASM Batch' : 'Loading Worker...'}
            </button>
          </div>
          {(batchJsTime !== null || batchWasmTime !== null) && (
            <div className="space-y-2 mt-4">
              {batchResult !== null && (
                <p className="text-lg text-gray-800">
                  Result: <span className="font-mono font-bold">{batchResult}</span>
                </p>
              )}
              {batchJsTime !== null && (
                <p className="text-sm text-gray-500">
                  JS Time: <span className="text-gray-900 font-bold">{batchJsTime.toFixed(4)}</span> ms
                </p>
              )}
              {batchWasmTime !== null && (
                <p className="text-sm text-gray-500">
                  WASM Time: <span className="text-gray-900 font-bold">{batchWasmTime.toFixed(4)}</span> ms
                </p>
              )}
            </div>
          )}
        </div>

        {/* Streaming Sum Section */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-cyan-600">Streaming Sum (Chunks)</h2>
          <div className="flex flex-col gap-3 mb-4">
            <label className="text-sm text-gray-600">
              Total size
              <input
                type="number"
                min={1}
                value={streamSize}
                onChange={(e) => setStreamSize(Number(e.target.value))}
                className="ml-2 p-2 border rounded text-black w-32"
              />
            </label>
            <label className="text-sm text-gray-600">
              Chunk size
              <input
                type="number"
                min={1}
                value={streamChunkSize}
                onChange={(e) => setStreamChunkSize(Number(e.target.value))}
                className="ml-2 p-2 border rounded text-black w-32"
              />
            </label>
          </div>
          <button
            onClick={runStreamedSum}
            disabled={!isWorkerReady}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded text-white mb-4 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isWorkerReady ? 'Run Streaming Sum' : 'Loading Worker...'}
          </button>
          {streamSum !== null && (
            <div className="space-y-2">
              <p className="text-lg text-gray-800">
                Result: <span className="font-mono font-bold">{streamSum}</span>
              </p>
              <p className="text-sm text-gray-500">
                Time: <span className="text-gray-900 font-bold">{streamTime?.toFixed(4)}</span> ms
              </p>
            </div>
          )}
        </div>

        {/* Vector Sum Section */}
        <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-emerald-600">Vector Sum (WASM Worker)</h2>
          <div className="flex items-center gap-2 mb-4">
            <label className="text-sm text-gray-600">Size:</label>
            <input
              type="number"
              min={1}
              value={sumSize}
              onChange={(e) => setSumSize(Number(e.target.value))}
              className="p-2 border rounded text-black w-32"
            />
          </div>
          <button
            onClick={runSumArray}
            disabled={!isWorkerReady}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded text-white mb-4 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isWorkerReady ? 'Run Sum' : 'Loading Worker...'}
          </button>
          {sumResult !== null && (
            <div className="space-y-2">
              <p className="text-lg text-gray-800">
                Result: <span className="font-mono font-bold">{sumResult}</span>
              </p>
              <p className="text-sm text-gray-500">
                Time: <span className="text-gray-900 font-bold">{sumTime?.toFixed(4)}</span> ms
              </p>
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
          {showSabWarning && (
            <p className="text-xs text-red-500 mb-2">
              SharedArrayBuffer requires COOP/COEP headers. Update production headers to enable it.
            </p>
          )}
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

      {workerError && (
        <p className="text-sm text-red-600">Worker error: {workerError}</p>
      )}

    </div>
  );
}
