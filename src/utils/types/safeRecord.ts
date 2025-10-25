export type SafeRecord<K extends keyof never, T> = {
  [P in K]: T | undefined;
};

export const safeRecordValues = <K extends keyof never, T>(
  rec: SafeRecord<K, T>
) => {
  return Object.values(rec) as T[];
};

export const safeRecordEntries = <K extends keyof never, T>(
  rec: SafeRecord<K, T>
) => {
  return Object.entries(rec) as [K, T][];
};
