export const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export const audPrecise = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-AU", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function percent(value: number) {
  return percentFormatter.format(Number.isFinite(value) ? value : 0);
}

export function money(cents: number) {
  return aud.format(cents / 100);
}

export function moneyPrecise(cents: number) {
  return audPrecise.format(cents / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
