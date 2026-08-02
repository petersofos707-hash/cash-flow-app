import Link from "next/link";
export default function NotFound() {
  return (
    <div className="state-page">
      <span className="eyebrow">404</span>
      <h1>That page isn’t part of your financial workspace.</h1>
      <Link className="primary-button" href="/dashboard">
        Return to dashboard
      </Link>
    </div>
  );
}
