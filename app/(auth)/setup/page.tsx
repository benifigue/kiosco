"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function SetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [storeName, setStoreName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (adminPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }

    if (adminPassword.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, adminPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Error al configurar", "error");
        return;
      }

      showToast("¡Configuración exitosa! Ya puedes ingresar.", "success");
      router.push("/login");
    } catch (err) {
      showToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "20px",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "32px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #0ea5e9, #818cf8)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              margin: "0 auto 16px",
            }}
          >
            🚀
          </div>
          <h1 style={{ fontSize: "24px", margin: "0 0 8px" }}>Bienvenido</h1>
          <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>
            Configura tu negocio para comenzar a trabajar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label className="label">Nombre de tu Negocio</label>
              <input
                className="input"
                required
                placeholder="Ej: Kiosco El Sol"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase" }}>
                Seguridad de Administrador
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label className="label">Nueva Contraseña para 'admin'</label>
                  <input
                    className="input"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Confirmar Contraseña</label>
                  <input
                    className="input"
                    type="password"
                    required
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", height: "42px", marginTop: "10px" }}
              disabled={loading}
            >
              {loading ? "Configurando..." : "Comenzar ahora"}
            </button>
          </div>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          Estos datos podrán ser modificados más tarde desde el panel de configuración.
        </p>
      </div>
    </div>
  );
}
