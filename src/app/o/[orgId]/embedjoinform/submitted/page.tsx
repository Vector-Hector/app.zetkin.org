import { EmbeddedJoinFormStyles } from 'features/joinForms/components/EmbeddedJoinFormStyles';

export default function SubmittedPage({
  searchParams,
}: {
  searchParams: { stylesheet?: string };
}) {
  return (
    <div>
      <h2>Form submitted!</h2>
      <EmbeddedJoinFormStyles stylesheet={searchParams.stylesheet} />
    </div>
  );
}
