import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { SWRProvider } from "@/components/SWRProvider";
import { CallProvider } from "@/components/CallProvider";
import { CallUI } from "@/components/CallUI";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <CallProvider>
        <SWRProvider>
          <AppShell>{children}</AppShell>
        </SWRProvider>
        <CallUI />
      </CallProvider>
    </AuthProvider>
  );
}
