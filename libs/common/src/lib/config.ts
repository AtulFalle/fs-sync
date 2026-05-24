export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function redisConnectionOptions() {
  return {
    host: optionalEnv('REDIS_HOST', 'localhost'),
    port: Number(optionalEnv('REDIS_PORT', '6379')),
    maxRetriesPerRequest: null,
  };
}
