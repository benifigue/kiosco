import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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

  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar userName={user.name} userRole={user.role} />
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
