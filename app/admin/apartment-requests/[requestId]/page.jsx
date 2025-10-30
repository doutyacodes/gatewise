import ReviewRequestClient from './ReviewRequestClient';

export default async function Page({ params }) {
  const resolvedParams = await params;
  return <ReviewRequestClient params={resolvedParams} />;
}