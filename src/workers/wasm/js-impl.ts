/** Recursive Fibonacci - O(2^n) */
export function fibonacciJS(n: number): number {
  if (n <= 1) return n;
  return fibonacciJS(n - 1) + fibonacciJS(n - 2);
}

/** Iterative Fibonacci - O(n) */
export function fibonacciIterJS(n: number): bigint {
  if (n === 0) return 0n;
  let a = 0n;
  let b = 1n;
  for (let i = 1; i < n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

/** Naive Matrix Multiplication - O(n^3) */
export function matrixMultiplyJS(
  a: Float64Array,
  b: Float64Array,
  c: Float64Array,
  n: number
): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += a[i * n + k] * b[k * n + j];
      }
      c[i * n + j] = sum;
    }
  }
}

/** Quicksort - O(n log n) average */
export function quicksortJS(arr: Float64Array): void {
  quicksortImpl(arr, 0, arr.length - 1);
}

function quicksortImpl(arr: Float64Array, low: number, high: number): void {
  if (low < high) {
    const pivot = partition(arr, low, high);
    quicksortImpl(arr, low, pivot - 1);
    quicksortImpl(arr, pivot + 1, high);
  }
}

function partition(arr: Float64Array, low: number, high: number): number {
  const pivotVal = arr[high];
  let i = low;
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivotVal) {
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
      i++;
    }
  }
  const temp = arr[i];
  arr[i] = arr[high];
  arr[high] = temp;
  return i;
}
