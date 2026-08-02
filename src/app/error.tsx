"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="state-page">
      <span className="eyebrow">Something went wrong</span>
      <h1>We couldn’t load this financial view.</h1>
      <p>Your data has not been changed. Try the request again.</p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
