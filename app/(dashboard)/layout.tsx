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
  try {
    // Check if the model exists in the client before calling it
    if ((prisma as any).storeConfig) {
      const storeConfig = await (prisma as any).storeConfig.findUnique({
        where: { id: "default-config" },
      });
      if (storeConfig?.name) storeName = storeConfig.name;
    }
  } catch (err) {
    console.error("Error fetching store config:", err);
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar
            userName={user.name}
            userRole={user.role}
            storeName={storeName}
          />
          <main
            style={{
              marginLeft: "220px",
              flex: 1,
              padding: "28px 32px",
              minHeight: "100vh",
              background: "var(--bg)",
            }}
          >
            {children}
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
