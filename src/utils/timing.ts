export function msUntilNextSecond(nowMs: number): number {
    const remainder = nowMs % 1000;
    return remainder === 0 ? 1000 : 1000 - remainder;
}

export function msUntilNextMinute(nowMs: number): number {
    const remainder = nowMs % 60000;
    return remainder === 0 ? 60000 : 60000 - remainder;
}
