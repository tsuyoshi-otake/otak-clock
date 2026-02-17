export interface TimeZoneInfo {
    label: string;
    timeZoneId: string; // IANA timezone ID
    region: string;
    baseUtcOffset: number;
}

export type FormatterPair = {
    timeWithSeconds: Intl.DateTimeFormat;
    timeNoSeconds: Intl.DateTimeFormat;
    date: Intl.DateTimeFormat;
    timeZoneName: Intl.DateTimeFormat;
};
