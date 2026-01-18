import { describe, expect, it } from 'vitest';
import { fibonacciJS } from '../../src/lib/fibonacci';

describe('fibonacciJS', () => {
  it('returns correct values for base cases', () => {
    expect(fibonacciJS(0)).toBe(0);
    expect(fibonacciJS(1)).toBe(1);
  });

  it('returns correct values for small inputs', () => {
    expect(fibonacciJS(5)).toBe(5);
    expect(fibonacciJS(10)).toBe(55);
  });
});
