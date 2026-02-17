/**
 * Removes the oldest entry when the map is at or above `maxSize`.
 * Note: This is insertion-order eviction (not a true LRU).
 */
export function evictOldestIfOverCapacity<K, V>(map: Map<K, V>, maxSize: number): void {
    if (maxSize <= 0) {
        map.clear();
        return;
    }

    if (map.size < maxSize) {
        return;
    }

    const first = map.keys().next();
    if (!first.done) {
        map.delete(first.value);
    }
}

