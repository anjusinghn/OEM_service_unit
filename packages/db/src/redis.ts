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

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw === null) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export async function cacheDelete(key: string): Promise<number> {
  return redis.del(key);
}

export type RedisMessageHandler = (
  message: string,
  channel: string,
) => void | Promise<void>;

export async function publish(channel: string, message: string): Promise<number> {
  return redisPub.publish(channel, message);
}

export async function subscribe(
  channels: string | string[],
  handler: RedisMessageHandler,
): Promise<() => Promise<void>> {
  const channelList = Array.isArray(channels) ? channels : [channels];

  const listener = (channel: string, message: string): void => {
    void handler(message, channel);
  };

  redisSub.on("message", listener);
  await redisSub.subscribe(...channelList);

  return async () => {
    redisSub.off("message", listener);
    await redisSub.unsubscribe(...channelList);
  };
}

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), redisPub.quit(), redisSub.quit()]);
}
