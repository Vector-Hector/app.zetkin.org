import { SafeRecord } from 'utils/types/safeRecord';

export type TypeOption = 'image';

export const TYPE_OPTIONS: SafeRecord<TypeOption, string[]> = {
  image: ['image/png', 'image/jpeg'],
};
