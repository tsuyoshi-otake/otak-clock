export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;

export function msUntilNextSecond(nowMs: number): number {
    const remainder = nowMs % MS_PER_SECOND;
    return remainder === 0 ? MS_PER_SECOND : MS_PER_SECOND - remainder;
}

export function msUntilNextMinute(nowMs: number): number {
    const remainder = nowMs % MS_PER_MINUTE;
    return remainder === 0 ? MS_PER_MINUTE : MS_PER_MINUTE - remainder;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
