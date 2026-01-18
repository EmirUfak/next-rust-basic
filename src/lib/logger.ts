export type LogLevel = 'info' | 'warn' | 'error';

export const log = (level: LogLevel, message: string, data?: unknown) => {
  const payload = data ? { data } : undefined;
  if (level === 'error') {
    console.error(message, payload);
  } else if (level === 'warn') {
    console.warn(message, payload);
  } else {
    console.info(message, payload);
  }
};

export const measure = (name: string) => {
  performance.mark(`${name}:start`);
  return () => {
    performance.mark(`${name}:end`);
    performance.measure(name, `${name}:start`, `${name}:end`);
  };
};
