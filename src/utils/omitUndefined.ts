import { isUndefined, omitBy } from 'lodash';

import { SafeRecord } from 'utils/types/safeRecord';

/**
 * Omits properties with `undefined` values from an object.
 *
 * @param obj - The object to process.
 * @returns A new object with all properties that have `undefined` values removed.
 */
export const omitUndefined = (
  obj: SafeRecord<string, unknown>
): SafeRecord<string, unknown> => omitBy(obj, isUndefined);
