/**
 * Precomputed "00".."99" strings.
 *
 * The clock rebuilds its status bar text once per second, forever, in every window. Going
 * through `String(n).padStart(2, '0')` there allocates two throwaway strings per field per
 * tick; a 100-entry table built once at module load removes that entirely and turns the
 * conversion into an array index.
 */
const TWO_DIGITS: readonly string[] = Array.from({ length: 100 }, (_, i) => (i < 10 ? `0${i}` : `${i}`));

/** Zero-pads `value` to two digits. Falls back to padStart outside 0-99. */
export function pad2(value: number): string {
    const cached = TWO_DIGITS[value];
    return cached ?? String(value).padStart(2, '0');
}
