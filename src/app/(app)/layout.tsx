import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/current-user";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell email={user.email}>{children}</AppShell>;
}
