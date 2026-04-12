import {
  isWorkerResponse,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-messages';

interface PendingRequest {
  resolve: (value: WorkerResponse) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface WorkerEntry {
  worker: Worker;
  pending: Map<string, PendingRequest>;
}

export class WorkerPool {
  private readonly entries: WorkerEntry[] = [];
  private nextIndex = 0;

  constructor(
    private readonly size: number,
    private readonly requestTimeoutMs = 30_000
  ) {}

  async init(createWorker: () => Worker): Promise<void> {
    const targets = Array.from({ length: this.size }, () => {
      const worker = createWorker();
      const entry: WorkerEntry = { worker, pending: new Map() };

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;

        if (!isWorkerResponse(message)) {
          return;
        }

        const handler = entry.pending.get(message.requestId);

        if (!handler) return;

        clearTimeout(handler.timeoutId);

        if (message.type === 'error') {
          handler.reject(new Error(message.message));
        } else {
          handler.resolve(message);
        }

        entry.pending.delete(message.requestId);
      };

      worker.onerror = (event) => {
        this.rejectAllPending(entry, event.message ?? 'Worker error');
      };

      this.entries.push(entry);

      return this.post(entry, {
        type: 'ping',
        requestId: this.createRequestId(),
        version: WORKER_PROTOCOL_VERSION,
      });
    });

    await Promise.all(targets);
  }

  terminate(): void {
    this.entries.forEach((entry) => {
      this.rejectAllPending(entry, 'Worker pool terminated');
      entry.worker.terminate();
    });
    this.entries.length = 0;
  }

  request(request: WorkerRequest): Promise<WorkerResponse> {
    if (this.entries.length === 0) {
      return Promise.reject(new Error('Worker pool is not initialized'));
    }
    const entry = this.entries[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % this.entries.length;
    return this.post(entry, request);
  }

  requestOnWorker(index: number, request: WorkerRequest): Promise<WorkerResponse> {
    if (this.entries.length === 0) {
      return Promise.reject(new Error('Worker pool is not initialized'));
    }
    const entry = this.entries[index];
    if (!entry) {
      return Promise.reject(new Error('Worker index out of range'));
    }
    return this.post(entry, request);
  }

  private post(entry: WorkerEntry, request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise<WorkerResponse>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const pending = entry.pending.get(request.requestId);
        if (!pending) {
          return;
        }
        entry.pending.delete(request.requestId);
        pending.reject(
          new Error(
            `Worker request timed out after ${this.requestTimeoutMs}ms (${request.type})`
          )
        );
      }, this.requestTimeoutMs);

      entry.pending.set(request.requestId, { resolve, reject, timeoutId });

      try {
        entry.worker.postMessage(request);
      } catch (error) {
        clearTimeout(timeoutId);
        entry.pending.delete(request.requestId);
        reject(
          error instanceof Error
            ? error
            : new Error('Failed to post message to worker')
        );
      }
    });
  }

  private rejectAllPending(entry: WorkerEntry, message: string): void {
    entry.pending.forEach((pending, requestId) => {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(message));
      entry.pending.delete(requestId);
    });
  }

  private createRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
