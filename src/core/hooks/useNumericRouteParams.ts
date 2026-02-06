import { useRouter } from 'next/router';
import { useContext } from 'react';

import { ResolvedParamsContext } from 'core/env/ResolvedParamsContext';

export default function useNumericRouteParams(): Record<string, number> {
  const resolvedParams = useContext(ResolvedParamsContext);

  const input = useRouter().query;
  const resolvedInput = { ...input, ...resolvedParams };
  const output: Record<string, number> = {};
  Object.keys(resolvedInput).forEach((key: string) => {
    const value = parseInt(resolvedInput[key] as string);
    if (!isNaN(value)) {
      output[key] = value;
    }
  });

  return output;
}
