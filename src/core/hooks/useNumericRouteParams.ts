import { useRouter } from 'next/router';

import { SafeRecord } from 'utils/types/safeRecord';

export default function useNumericRouteParams(): SafeRecord<string, number> {
  const input = useRouter().query;
  const output: SafeRecord<string, number> = {};
  Object.keys(input).forEach((key: string) => {
    const value = parseInt(input[key] as string);
    if (!isNaN(value)) {
      output[key] = value;
    }
  });

  return output;
}
