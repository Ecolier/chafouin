import { createClient } from "redis";

export const createRedisClient = () => createClient({
  url: 'redis://telegram-cache:6379'
});

export type RedisClient = ReturnType<typeof createRedisClient>;