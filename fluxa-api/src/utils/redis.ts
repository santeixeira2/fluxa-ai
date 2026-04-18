import Redis from "ioredis";
import { config } from "@/config";

export const redis = new Redis(String(config.redisUrl));

const DEFAULT_TTL = 10;

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (raw == null) return null;
  return JSON.parse(raw) as T;
}

export async function setCached<T>(key: string, 
  value: T, 
  ttl: number = DEFAULT_TTL): Promise<void> {
    const ttlSeconds = Math.ceil(ttl / 1000);
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function deleteCached(key: string): Promise<void> {
  await redis.del(key);
}