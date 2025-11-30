import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const globalForRedis = globalThis as unknown as {
  __redis?: Redis;
  __redisPub?: Redis;
  __redisSub?: Redis;
};

export const redis: Redis =
  globalForRedis.__redis ??
  new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });

export const redisPub: Redis =
  globalForRedis.__redisPub ?? redis.duplicate();

export const redisSub: Redis =
  globalForRedis.__redisSub ?? redis.duplicate();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.__redis = redis;
  globalForRedis.__redisPub = redisPub;
  globalForRedis.__redisSub = redisSub;
}

export type CacheSetOptions = {
  ttlSeconds?: number;
};

export async function cacheSetJson<T>(
  key: string,
  value: T,
  options: CacheSetOptions = {},
): Promise<"OK" | null> {
  const payload = JSON.stringify(value);

  if (options.ttlSeconds && options.ttlSeconds > 0) {
    return redis.set(key, payload, "EX", options.ttlSeconds);
  }

  return redis.set(key, payload);
}
