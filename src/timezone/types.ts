export interface TimeZoneInfo {
    label: string;
    timeZoneId: string; // IANA timezone ID
    region: string;
    baseUtcOffset: number;
}
