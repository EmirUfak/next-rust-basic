/**
 * Recursive Fibonacci - O(2^n) complexity
 * Kept for benchmark comparison purposes
 */
export const fibonacciJS = (n: number): number => {
  if (n <= 1) return n;
  return fibonacciJS(n - 1) + fibonacciJS(n - 2);
};

/**
 * Iterative Fibonacci - O(n) complexity
 * ~1000x faster than recursive for n=40
 * Uses BigInt for large numbers to avoid overflow
 */
export const fibonacciIterJS = (n: number): bigint => {
  if (n === 0) return 0n;
  let a = 0n, b = 1n;
  for (let i = 1; i < n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
};

/**
 * Memoized Fibonacci - O(n) with caching
 * Good for repeated calls with overlapping subproblems
 */
const fibCache = new Map<number, bigint>();
export const fibonacciMemoJS = (n: number): bigint => {
  if (n === 0) return 0n;
  if (n === 1) return 1n;
  
  const cached = fibCache.get(n);
  if (cached !== undefined) return cached;
  
  const result = fibonacciMemoJS(n - 1) + fibonacciMemoJS(n - 2);
  fibCache.set(n, result);
  return result;
};
