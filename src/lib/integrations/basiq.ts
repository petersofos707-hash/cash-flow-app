import { createHmac, timingSafeEqual } from "node:crypto";

interface BasiqToken {
  access_token: string;
  expires_in: number;
  token_type: "Bearer";
}

export class BasiqAdapter {
  constructor(
    private readonly apiKey = process.env.BASIQ_API_KEY,
    private readonly baseUrl = process.env.BASIQ_API_URL ?? "https://au-api.basiq.io",
    private readonly version = process.env.BASIQ_API_VERSION ?? "3.0",
  ) {}

  private requireKey() {
    if (!this.apiKey) throw new Error("Basiq is not configured. Add sandbox credentials first.");
    return this.apiKey;
  }

  async token(scope: "SERVER_ACCESS" | "CLIENT_ACCESS", userId?: string) {
    const body = new URLSearchParams({ scope });
    if (userId) body.set("userId", userId);
    const response = await fetch(`${this.baseUrl}/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.requireKey()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "basiq-version": this.version,
      },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Basiq authentication failed (${response.status}).`);
    return (await response.json()) as BasiqToken;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const { access_token: token } = await this.token("SERVER_ACCESS");
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "basiq-version": this.version,
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Basiq request failed (${response.status}).`);
    return (await response.json()) as T;
  }

  createUser(email: string) {
    return this.request<{ id: string }>("/users", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async createConsentUrl(userId: string, action: "connect" | "manage" = "connect") {
    const token = await this.token("CLIENT_ACCESS", userId);
    return `https://consent.basiq.io/home?token=${encodeURIComponent(token.access_token)}&action=${action}`;
  }

  listConnections(userId: string) {
    return this.request(`/users/${userId}/connections`);
  }
  listAccounts(userId: string) {
    return this.request(`/users/${userId}/accounts`);
  }
  listTransactions(userId: string) {
    return this.request(`/users/${userId}/transactions`);
  }
  refreshConnection(userId: string, connectionId: string) {
    return this.request(`/users/${userId}/connections/${connectionId}/refresh`, { method: "POST" });
  }
  deleteConnection(userId: string, connectionId: string) {
    return this.request(`/users/${userId}/connections/${connectionId}`, { method: "DELETE" });
  }
}

export function verifyBasiqWebhook(
  rawBody: string,
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  secret = process.env.BASIQ_WEBHOOK_SECRET,
) {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const secretPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const expected = createHmac("sha256", Buffer.from(secretPart, "base64"))
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest();
  return headers.signature.split(" ").some((candidate) => {
    const value = candidate.includes(",") ? candidate.split(",")[1] : candidate;
    try {
      const actual = Buffer.from(value, "base64");
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  });
}
