// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyBasiqWebhook } from "@/lib/integrations/basiq";

describe("Basiq webhook validation", () => {
  it("accepts a correctly signed current payload", () => {
    const body = JSON.stringify({ type: "connection.updated" });
    const id = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const key = Buffer.from("test-webhook-key-with-enough-bytes").toString("base64");
    const signature = createHmac("sha256", Buffer.from(key, "base64"))
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64");
    expect(
      verifyBasiqWebhook(body, { id, timestamp, signature: `v1,${signature}` }, `whsec_${key}`),
    ).toBe(true);
  });

  it("rejects stale or modified payloads", () => {
    const key = Buffer.from("test-webhook-key-with-enough-bytes").toString("base64");
    expect(
      verifyBasiqWebhook(
        "modified",
        { id: "msg", timestamp: "1", signature: "v1,ZmFrZQ==" },
        `whsec_${key}`,
      ),
    ).toBe(false);
  });
});
