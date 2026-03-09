"use client";

import { useState, useEffect, FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";

interface Config {
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("COLABORADOR");
  const [form, setForm] = useState<Config>({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    currency: "ARS",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { role: string } }) => {
        if (d.user) setUserRole(d.user.role);
      })
      .catch(() => {});
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (res.ok && data) {
        setForm({
          name: data.name || "",
          description: data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          currency: data.currency || "ARS",
        });
      }
    } catch {
      showToast("Error al cargar configuración", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (userRole !== "ADMIN") return;

    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error ?? "Error al guardar", "error");
        return;
      }

      showToast("Configuración guardada", "success");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        Cargando configuración...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", margin: "0 0 4px" }}>Configuración del Negocio</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
          Personaliza los datos que se muestran en el sistema
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label className="label">Nombre del Negocio *</label>
              <input
                className="input"
                required
                disabled={userRole !== "ADMIN"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Kiosco 'El Trébol'"
              />
            </div>

            <div>
              <label className="label">Descripción / Eslogan</label>
              <input
                className="input"
                disabled={userRole !== "ADMIN"}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Gestión profesional para tu negocio"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="label">Teléfono</label>
                <input
                  className="input"
                  disabled={userRole !== "ADMIN"}
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ej: 11 1234-5678"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  disabled={userRole !== "ADMIN"}
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Dirección</label>
              <input
                className="input"
                disabled={userRole !== "ADMIN"}
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej: Av. Rivadavia 1234, CABA"
              />
            </div>

            <div>
              <label className="label">Moneda</label>
              <select
                className="input"
                disabled={userRole !== "ADMIN"}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="ARS">Peso Argentino (ARS)</option>
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="CLP">Peso Chileno (CLP)</option>
                <option value="UYU">Peso Uruguayo (UYU)</option>
              </select>
            </div>

            {userRole === "ADMIN" ? (
              <div style={{ marginTop: "8px" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--danger)", textAlign: "center" }}>
                Solo los administradores pueden modificar la configuración.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
