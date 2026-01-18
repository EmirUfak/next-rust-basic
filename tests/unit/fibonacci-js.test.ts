import { describe, expect, it } from 'vitest';
import { fibonacciJS, fibonacciIterJS, fibonacciMemoJS } from '../../src/lib/fibonacci';

describe('fibonacciJS (recursive)', () => {
  it('returns correct values for base cases', () => {
    expect(fibonacciJS(0)).toBe(0);
    expect(fibonacciJS(1)).toBe(1);
  });

  it('returns correct values for small inputs', () => {
    expect(fibonacciJS(5)).toBe(5);
    expect(fibonacciJS(10)).toBe(55);
  });
});

describe('fibonacciIterJS (iterative)', () => {
  it('returns correct values for base cases', () => {
    expect(fibonacciIterJS(0)).toBe(0n);
    expect(fibonacciIterJS(1)).toBe(1n);
  });

  it('returns correct values for small inputs', () => {
    expect(fibonacciIterJS(5)).toBe(5n);
    expect(fibonacciIterJS(10)).toBe(55n);
  });

  it('handles large inputs without overflow', () => {
    // fib(50) = 12586269025
    expect(fibonacciIterJS(50)).toBe(12586269025n);
    // fib(100) = 354224848179261915075
    expect(fibonacciIterJS(100)).toBe(354224848179261915075n);
  });
});

describe('fibonacciMemoJS (memoized)', () => {
  it('returns correct values for base cases', () => {
    expect(fibonacciMemoJS(0)).toBe(0n);
    expect(fibonacciMemoJS(1)).toBe(1n);
  });

  it('returns correct values and matches iterative', () => {
    for (let i = 0; i <= 20; i++) {
      expect(fibonacciMemoJS(i)).toBe(fibonacciIterJS(i));
    }
  });
});
