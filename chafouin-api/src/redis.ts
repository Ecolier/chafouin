import { createClient } from "redis";

const redisClient = createClient({
  url: 'redis://telegram-cache:6380'
});

export type RedisClient = typeof redisClient;
export default redisClient;