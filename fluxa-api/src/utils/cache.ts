const cache = new Map<string, { value: unknown, expiresAt: number }>();
const TTL_MS = 10_000;

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = TTL_MS): void {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function deleteCached(key: string): void {
    cache.delete(key);
}