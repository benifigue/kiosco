import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let storeName = "Kiosco";
  let membershipType = "FREE";
  let membershipExpires: Date | null = null;

  try {
    if ((prisma as any).storeConfig) {
      const storeConfig = await (prisma as any).storeConfig.findUnique({
        where: { id: "default-config" },
      });
      if (storeConfig) {
        if (storeConfig.name) storeName = storeConfig.name;
        membershipType = storeConfig.membershipType || "FREE";
        membershipExpires = storeConfig.membershipExpires;
      }
    }
  } catch (err) {
    console.error("Error fetching store config:", err);
  }

  // Check if membership has expired (only for FREE/PRO/PREMIUM if it's a trial or time-based)
  const isExpired = membershipExpires && new Date(membershipExpires) < new Date();

  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar
            userName={user.name}
            userRole={user.role}
            storeName={storeName}
            membershipType={membershipType}
          />
          <main
            style={{
              marginLeft: "220px",
              flex: 1,
              padding: "28px 32px",
              minHeight: "100vh",
              background: "var(--bg)",
              position: "relative",
            }}
          >
            {isExpired && (
              <div style={{
                position: "sticky",
                top: "-28px",
                left: 0,
                right: 0,
                background: "var(--danger)",
                color: "white",
                padding: "10px",
                margin: "-28px -32px 24px -32px",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: "bold",
                zIndex: 10,
              }}>
                ⚠️ Su membresía ha expirado. Por favor, actualice su plan en Configuración para seguir operando.
              </div>
            )}
            {children}
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
