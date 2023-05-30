import { createClient } from "redis";

const redisClient = createClient({
  url: 'redis://telegram-cache:6379'
});

export type RedisClient = typeof redisClient;
export default redisClient;