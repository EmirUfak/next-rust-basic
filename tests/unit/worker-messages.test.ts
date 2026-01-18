import { describe, expect, it } from 'vitest';
import {
  WORKER_PROTOCOL_VERSION,
  isWorkerRequest,
  isWorkerResponse,
} from '../../src/workers/worker-messages';

describe('worker message contracts', () => {
  it('validates fibonacci request', () => {
    const message = {
      type: 'fibonacci',
      requestId: 'req-1',
      version: WORKER_PROTOCOL_VERSION,
      n: 10,
    };

    expect(isWorkerRequest(message)).toBe(true);
  });

  it('validates error response', () => {
    const message = {
      type: 'error',
      requestId: 'req-2',
      version: WORKER_PROTOCOL_VERSION,
      message: 'Oops',
    };

    expect(isWorkerResponse(message)).toBe(true);
  });

  it('rejects invalid version', () => {
    const message = {
      type: 'ping',
      requestId: 'req-3',
      version: 2,
    };

    expect(isWorkerRequest(message)).toBe(false);
  });
});
