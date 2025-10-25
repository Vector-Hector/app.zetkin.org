import { SafeRecord, safeRecordEntries } from 'utils/types/safeRecord';

export const objectToFormData = (
  obj: SafeRecord<string, string | string[]>
): FormData => {
  const formData = new FormData();

  for (const [key, value] of safeRecordEntries(obj)) {
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
    } else {
      formData.append(key, value);
    }
  }

  return formData;
};
