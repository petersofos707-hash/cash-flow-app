"use client";

import { ArrowRight, CircleDollarSign, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("owner@example.com");
  const [message, setMessage] = useState("");
  const [demoLink, setDemoLink] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setDemoLink("");
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as {
        message?: string;
        demoLink?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Unable to send the sign-in link.");
      setMessage(body.message ?? "Check your email for a secure sign-in link.");
      setDemoLink(body.demoLink ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <CircleDollarSign size={27} />
          <span>Cash Flow App</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow light">Your private financial picture</span>
          <h1>See where your money is taking you.</h1>
          <p>
            Track cash flow, build savings goals and follow your net worth with a clear monthly
            rhythm.
          </p>
          <div className="login-points">
            <div>
              <ShieldCheck />
              <span>
                <strong>Private by design</strong>Single-owner access and row-level security
              </span>
            </div>
            <div>
              <LockKeyhole />
              <span>
                <strong>Read-only banking</strong>No payments, transfers or trades
              </span>
            </div>
          </div>
        </div>
        <p className="login-disclaimer">
          Financial tracking only — not personalised financial advice.
        </p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-login-brand">
            <CircleDollarSign size={24} /> Cash Flow
          </div>
          <span className="eyebrow">Secure access</span>
          <h2>Welcome back</h2>
          <p>Enter the approved owner email. We’ll send a passwordless magic link.</p>
          <form onSubmit={submit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <button className="primary-button full" disabled={pending}>
              {pending ? "Preparing link…" : "Send secure sign-in link"}
              <ArrowRight size={18} />
            </button>
          </form>
          {message && (
            <div className="login-message" role="status">
              {message}
              {demoLink && (
                <a href={demoLink}>
                  Open the local demo magic link <ArrowRight size={16} />
                </a>
              )}
            </div>
          )}
          <div className="demo-explainer">
            <span /> Demo mode uses only clearly labelled fictional financial data stored in this
            browser.
          </div>
        </div>
      </section>
    </main>
  );
}
