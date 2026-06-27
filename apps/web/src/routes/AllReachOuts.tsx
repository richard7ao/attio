import { useParams } from 'react-router-dom';

// *PLACEHOLDER* — All reach-outs for a user
export function AllReachOuts() {
  const { userId } = useParams();
  return (
    <section>
      <h1>All Reach-outs *PLACEHOLDER*</h1>
      <p>Every transaction and message for user {userId}.</p>
    </section>
  );
}
