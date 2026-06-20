import IORedis from "ioredis";

type RedisClientOptions = {
  maxRetriesPerRequest?: number | null;
  connectTimeout?: number;
};

/** Compativel com Upstash (rediss://) e Redis local (redis://). */
export function createRedisClient(url: string, options: RedisClientOptions = {}): IORedis {
  const { maxRetriesPerRequest = null, connectTimeout } = options;
  const useTls = url.startsWith("rediss://");

  return new IORedis(url, {
    maxRetriesPerRequest,
    enableReadyCheck: false,
    ...(connectTimeout !== undefined ? { connectTimeout } : {}),
    ...(useTls ? { tls: {} } : {})
  });
}
