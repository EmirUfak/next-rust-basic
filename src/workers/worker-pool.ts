import {
  isWorkerResponse,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-messages';

interface WorkerEntry {
  worker: Worker;
  pending: Map<
    string,
    {
      resolve: (value: WorkerResponse) => void;
      reject: (error: Error) => void;
    }
  >;
}

export class WorkerPool {
  private readonly entries: WorkerEntry[] = [];
  private nextIndex = 0;

  constructor(private readonly size: number) {}

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

        if (message.type === 'error') {
          handler.reject(new Error(message.message));
        } else {
          handler.resolve(message);
        }

        entry.pending.delete(message.requestId);
      };

      worker.onerror = (event) => {
        entry.pending.forEach(({ reject }, requestId) => {
          entry.pending.delete(requestId);
          reject(new Error(event.message ?? 'Worker error'));
        });
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
    this.entries.forEach(({ worker }) => worker.terminate());
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

  private post(entry: WorkerEntry, request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise<WorkerResponse>((resolve, reject) => {
      entry.pending.set(request.requestId, { resolve, reject });
      entry.worker.postMessage(request);
    });
  }

  private createRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
