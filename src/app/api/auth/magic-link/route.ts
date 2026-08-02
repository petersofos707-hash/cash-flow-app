import { z } from "zod";
import { createMagicToken } from "@/lib/auth/session";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()) });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  const env = getServerEnv();
  if (parsed.data.email !== env.APPROVED_EMAIL.toLowerCase()) {
    return Response.json(
      { error: "This email is not approved for this private application." },
      { status: 403 },
    );
  }
  if (isDemoMode()) {
    const token = await createMagicToken(parsed.data.email);
    return Response.json({
      message: "Local demo link prepared. No email was sent.",
      demoLink: `/auth/confirm?token=${encodeURIComponent(token)}`,
    });
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${env.APP_URL}/auth/confirm` },
  });
  if (error)
    return Response.json({ error: "The secure sign-in link could not be sent." }, { status: 502 });
  return Response.json({ message: "Check your email for the secure sign-in link." });
}
