import "server-only";

import { redirect } from "next/navigation";
import { getServerEnv, usesSignedSession } from "@/lib/env";
import { readDemoSessionToken, type AppUser } from "./session";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<AppUser | null> {
  const env = getServerEnv();
  // "demo" and "postgres" modes both use the app's own signed-cookie
  // session; only "supabase" mode delegates to Supabase Auth.
  if (usesSignedSession()) {
    const user = await readDemoSessionToken();
    return user?.email.toLowerCase() === env.APPROVED_EMAIL.toLowerCase() ? user : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (error || !data.user || !email || email.toLowerCase() !== env.APPROVED_EMAIL.toLowerCase()) {
    return null;
  }
  return { id: data.user.id, email, mode: "supabase" };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
