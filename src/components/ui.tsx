"use client";

import { ArrowDownRight, ArrowUpRight, CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";
import { money } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: number;
  tone?: "neutral" | "positive" | "warm";
}) {
  return (
    <Card className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {trend !== undefined ? (
        <small className={trend >= 0 ? "trend-up" : "trend-down"}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(1)}% {detail}
        </small>
      ) : (
        detail && <small>{detail}</small>
      )}
    </Card>
  );
}

export function ProgressBar({
  value,
  colour = "var(--accent)",
}: {
  value: number;
  colour?: string;
}) {
  const width = Math.max(0, Math.min(value * 100, 100));
  return (
    <div className="progress-track" aria-label={`${Math.round(value * 100)} percent complete`}>
      <span style={{ width: `${width}%`, background: colour }} />
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Definition({ children }: { children: ReactNode }) {
  return (
    <span className="definition" title={typeof children === "string" ? children : undefined}>
      <Info size={13} />
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <CircleAlert size={24} />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function Amount({ cents, muted = false }: { cents: number; muted?: boolean }) {
  return (
    <span
      className={`${cents >= 0 ? "amount-positive" : "amount-negative"} ${muted ? "muted" : ""}`}
    >
      {cents > 0 ? "+" : ""}
      {money(cents)}
    </span>
  );
}
