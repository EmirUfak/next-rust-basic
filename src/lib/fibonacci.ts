export const fibonacciJS = (n: number): number => {
  if (n <= 1) return n;
  return fibonacciJS(n - 1) + fibonacciJS(n - 2);
};
