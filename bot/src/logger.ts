export function log(module: string, message: string, data?: Record<string, unknown>): void {
  const prefix = `[bot:${module}]`;
  if (data) {
    console.log(prefix, message, JSON.stringify(data));
  } else {
    console.log(prefix, message);
  }
}

export function warn(module: string, message: string, data?: Record<string, unknown>): void {
  const prefix = `[bot:${module}]`;
  if (data) {
    console.warn(prefix, message, JSON.stringify(data));
  } else {
    console.warn(prefix, message);
  }
}

export function error(module: string, message: string, err?: unknown): void {
  const prefix = `[bot:${module}]`;
  if (err instanceof Error) {
    console.error(prefix, message, err.message);
  } else if (err) {
    console.error(prefix, message, err);
  } else {
    console.error(prefix, message);
  }
}
