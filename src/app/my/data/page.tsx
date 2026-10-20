import redirectIfLoginNeeded from 'core/utils/redirectIfLoginNeeded';
import Portal from 'features/selfService/Portal';

export const metadata = { title: 'Your data' };

export default async function Page() {
  await redirectIfLoginNeeded({ allowUnverified: true });
  return <Portal />;
}
