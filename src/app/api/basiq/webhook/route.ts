import { verifyBasiqWebhook } from "@/lib/integrations/basiq";
export async function POST(request: Request) {
  const body = await request.text();
  const valid = verifyBasiqWebhook(body, {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
  });
  if (!valid) return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  return Response.json({ received: true }, { status: 202 });
}
