import useEnv from '../../core/hooks/useEnv';
import hasFeature from './hasFeature';
import { SafeRecord } from 'utils/types/safeRecord';

export default function useFeatureWithOrg(
  featureLabel: string,
  orgId: number
): boolean {
  const env = useEnv();

  const untypedVars = env.vars as SafeRecord<string, string | undefined>;
  return hasFeature(featureLabel, orgId, untypedVars);
}
