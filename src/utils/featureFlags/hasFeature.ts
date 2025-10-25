import { SafeRecord } from 'utils/types/safeRecord';

export default function hasFeature(
  featureLabel: string,
  orgId: number,
  envVars: SafeRecord<string, string | undefined>
): boolean {
  const envValue = envVars[featureLabel];

  const settings = envValue?.split(',') || [];

  return settings.some((setting) => {
    return setting == '*' || setting == orgId.toString();
  });
}
