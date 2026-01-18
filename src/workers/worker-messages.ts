export const WORKER_PROTOCOL_VERSION = 1 as const;
export const MAX_BUFFER_LENGTH = 2_000_000;

export type WorkerRequest =
  | {
      type: 'ping';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
    }
  | {
      type: 'fibonacci';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      n: number;
    }
  | {
      type: 'fibonacciBatch';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      n: number;
      iterations: number;
    }
  | {
      type: 'sharedBufferProcess';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      buffer: SharedArrayBuffer;
      control: SharedArrayBuffer;
      length: number;
    }
  | {
      type: 'sumArray';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      data: Uint32Array;
    };

export type WorkerResponse =
  | {
      type: 'ready';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
    }
  | {
      type: 'fibonacciResult';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      result: number;
    }
  | {
      type: 'fibonacciBatchResult';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      result: number;
      iterations: number;
    }
  | {
      type: 'sharedBufferDone';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
    }
  | {
      type: 'sumArrayResult';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      result: number;
    }
  | {
      type: 'error';
      requestId: string;
      version: typeof WORKER_PROTOCOL_VERSION;
      message: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isWorkerRequest = (value: unknown): value is WorkerRequest => {
  if (!isRecord(value) || value.version !== WORKER_PROTOCOL_VERSION) return false;
  if (typeof value.requestId !== 'string') return false;

  switch (value.type) {
    case 'ping':
      return true;
    case 'fibonacci':
      return typeof value.n === 'number' && Number.isFinite(value.n);
    case 'fibonacciBatch':
      return (
        typeof value.n === 'number' &&
        Number.isFinite(value.n) &&
        typeof value.iterations === 'number' &&
        Number.isFinite(value.iterations)
      );
    case 'sharedBufferProcess':
      return (
        value.buffer instanceof SharedArrayBuffer &&
        value.control instanceof SharedArrayBuffer &&
        typeof value.length === 'number' &&
        Number.isFinite(value.length) &&
        Number.isInteger(value.length) &&
        value.length >= 0
      );
    case 'sumArray':
      return value.data instanceof Uint32Array;
    default:
      return false;
  }
};

export const isWorkerResponse = (value: unknown): value is WorkerResponse => {
  if (!isRecord(value) || value.version !== WORKER_PROTOCOL_VERSION) return false;
  if (typeof value.requestId !== 'string') return false;

  switch (value.type) {
    case 'ready':
      return true;
    case 'fibonacciResult':
    case 'fibonacciBatchResult':
    case 'sumArrayResult':
      return typeof value.result === 'number' && Number.isFinite(value.result);
    case 'sharedBufferDone':
      return true;
    case 'error':
      return typeof value.message === 'string';
    default:
      return false;
  }
};
