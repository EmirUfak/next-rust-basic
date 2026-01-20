import {
  box_blur,
  dot_product_simd,
  fft_demo,
  generate_signal,
  grayscale,
  sum_f32_simd,
  sum_u32,
  sum_u32_sab,
} from '../../../../.wasm/pkg/wasm_lib';
import {
  MAX_BUFFER_LENGTH,
  MAX_IMAGE_SIZE,
  WORKER_PROTOCOL_VERSION,
  type WorkerRequest,
} from '../../worker-messages';
import type { HandlerDeps } from './types';

export const handleOpsMessage = async (
  message: WorkerRequest,
  deps: HandlerDeps
): Promise<boolean> => {
  switch (message.type) {
    // ========== ARRAY OPERATIONS ==========
    case 'sumArray': {
      if (message.data.length > MAX_BUFFER_LENGTH) {
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }
      const result = sum_u32(message.data);
      deps.postMessageSafe({
        type: 'sumArrayResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    case 'sumArraySab': {
      if (message.length > MAX_BUFFER_LENGTH) {
        const control = new Int32Array(message.control);
        deps.signalComplete(control);
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: `Array length exceeds limit (${MAX_BUFFER_LENGTH}).`,
        });
        return true;
      }
      const view = new Uint32Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      const result = sum_u32_sab(view);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'sumArraySabResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    // ========== SIMD OPERATIONS ==========
    case 'dotProductSimd': {
      const aView = new Float32Array(message.aBuffer, 0, message.length);
      const bView = new Float32Array(message.bBuffer, 0, message.length);
      const control = new Int32Array(message.control);
      const result = dot_product_simd(aView, bView);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'dotProductSimdResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    case 'sumF32Simd': {
      const view = new Float32Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      const result = sum_f32_simd(view);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'sumF32SimdResult',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
        result,
      });
      return true;
    }

    // ========== IMAGE PROCESSING ==========
    case 'grayscale': {
      if (message.length > MAX_IMAGE_SIZE) {
        const control = new Int32Array(message.control);
        deps.signalComplete(control);
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: 'Image size exceeds limit.',
        });
        return true;
      }
      const view = new Uint8Array(message.buffer, 0, message.length);
      const control = new Int32Array(message.control);
      grayscale(view);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'grayscaleDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'boxBlur': {
      const imageSize = message.width * message.height * 4;
      if (imageSize > MAX_IMAGE_SIZE) {
        const control = new Int32Array(message.control);
        deps.signalComplete(control);
        deps.postMessageSafe({
          type: 'error',
          requestId: message.requestId,
          version: WORKER_PROTOCOL_VERSION,
          message: 'Image size exceeds limit.',
        });
        return true;
      }
      const view = new Uint8Array(message.buffer, 0, imageSize);
      const control = new Int32Array(message.control);
      box_blur(view, message.width, message.height, message.radius);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'boxBlurDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    // ========== FFT ==========
    case 'fftDemo': {
      const inputView = new Float64Array(message.inputBuffer, 0, message.size);
      const outputView = new Float64Array(message.outputBuffer, 0, message.size);
      const control = new Int32Array(message.control);
      fft_demo(inputView, outputView);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'fftDemoDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    case 'generateSignal': {
      const view = new Float64Array(message.buffer, 0, message.size);
      const control = new Int32Array(message.control);
      generate_signal(view, message.freq1, message.freq2, message.freq3);
      deps.signalComplete(control);
      deps.postMessageSafe({
        type: 'generateSignalDone',
        requestId: message.requestId,
        version: WORKER_PROTOCOL_VERSION,
      });
      return true;
    }

    default:
      return false;
  }
};
