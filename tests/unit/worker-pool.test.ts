import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerPool } from '../../src/workers/worker-pool';
import {
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from '../../src/workers/worker-messages';

type MockWorkerOptions = {
  respondToRequests?: boolean;
};

function createMockWorker(options: MockWorkerOptions = {}): Worker {
  const { respondToRequests = false } = options;

  const worker = {
    onmessage: null as ((event: MessageEvent<WorkerResponse>) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    postMessage(request: WorkerRequest) {
      if (request.type === 'ping') {
        queueMicrotask(() => {
          worker.onmessage?.({
            data: {
              type: 'ready',
              requestId: request.requestId,
              version: WORKER_PROTOCOL_VERSION,
            },
          } as MessageEvent<WorkerResponse>);
        });
        return;
      }

      if (!respondToRequests) {
        return;
      }

      if (request.type === 'fibonacci') {
        queueMicrotask(() => {
          worker.onmessage?.({
            data: {
              type: 'fibonacciResult',
              requestId: request.requestId,
              version: WORKER_PROTOCOL_VERSION,
              result: request.n,
            },
          } as MessageEvent<WorkerResponse>);
        });
      }
    },
    terminate: vi.fn(),
  };

  return worker as unknown as Worker;
}

describe('WorkerPool', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects stuck requests after timeout', async () => {
    vi.useFakeTimers();
    const pool = new WorkerPool(1, 20);
    await pool.init(() => createMockWorker());

    const requestPromise = pool.request({
      type: 'fibonacci',
      requestId: 'req-timeout',
      version: WORKER_PROTOCOL_VERSION,
      n: 20,
    });

    const assertion = expect(requestPromise).rejects.toThrow(
      'Worker request timed out after 20ms (fibonacci)'
    );

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it('rejects pending requests when pool is terminated', async () => {
    const pool = new WorkerPool(1, 1_000);
    await pool.init(() => createMockWorker());

    const requestPromise = pool.request({
      type: 'fibonacci',
      requestId: 'req-terminate',
      version: WORKER_PROTOCOL_VERSION,
      n: 30,
    });

    const assertion = expect(requestPromise).rejects.toThrow('Worker pool terminated');

    pool.terminate();
    await assertion;
  });
});