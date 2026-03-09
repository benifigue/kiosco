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
  membershipType: string;
  membershipExpires: string | null;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [userRole, setUserRole] = useState<string>("COLABORADOR");
  const [activeTab, setActiveTab] = useState<"general" | "membership">("general");
  const [activationKey, setActivationKey] = useState("");
  
  const [form, setForm] = useState<Config>({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    currency: "ARS",
    membershipType: "FREE",
    membershipExpires: null,
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
          membershipType: data.membershipType || "FREE",
          membershipExpires: data.membershipExpires || null,
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

  async function handleActivateMembership(e: FormEvent) {
    e.preventDefault();
    if (!activationKey) return;

    setActivating(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activationKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Error al activar", "error");
        return;
      }

      showToast("¡Membresía activada con éxito!", "success");
      setActivationKey("");
      loadConfig();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setActivating(false);
    }
  }

  function getRemainingDays() {
    if (!form.membershipExpires) return null;
    const expires = new Date(form.membershipExpires);
    const diff = expires.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        Cargando configuración...
      </div>
    );
  }

  const daysLeft = getRemainingDays();

  return (
    <div style={{ maxWidth: "700px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", margin: "0 0 4px" }}>Configuración del Sistema</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
          Gestiona los datos del negocio y tu suscripción
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "1px" }}>
        <button
          onClick={() => setActiveTab("general")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "general" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "general" ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("membership")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "membership" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "membership" ? "var(--accent)" : "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s"
          }}
        >
          Membresía
        </button>
      </div>

      {activeTab === "general" ? (
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

              {userRole === "ADMIN" && (
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
              )}
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Status card */}
          <div className="card" style={{ 
            background: form.membershipType !== 'FREE' ? 'linear-gradient(135deg, var(--bg-card), rgba(14,165,233,0.05))' : 'var(--bg-card)',
            border: form.membershipType !== 'FREE' ? '1px solid rgba(14,165,233,0.3)' : '1px solid var(--border)'
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase" }}>Estado Actual</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ margin: 0, fontSize: "24px" }}>
                    Plan {form.membershipType}
                  </h2>
                  <span className={`badge ${form.membershipType !== 'FREE' ? 'badge-info' : 'badge-neutral'}`}>
                    {form.membershipType !== 'FREE' ? 'Suscripción Activa' : 'Plan Básico'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "32px" }}>
                  {form.membershipType === 'PREMIUM' ? '💎' : form.membershipType === 'PRO' ? '🚀' : '🌱'}
                </div>
              </div>
            </div>

            {form.membershipExpires && (
              <div style={{ 
                padding: "16px", 
                background: "var(--bg)", 
                borderRadius: "12px", 
                display: "flex", 
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Vence el:</div>
                  <div style={{ fontWeight: 700 }}>{new Date(form.membershipExpires).toLocaleDateString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Tiempo restante:</div>
                  <div style={{ fontWeight: 700, color: daysLeft && daysLeft < 7 ? "var(--danger)" : "var(--success)" }}>
                    {daysLeft} días
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activation card */}
          {userRole === "ADMIN" && (
            <div className="card">
              <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Activar Membresía</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Ingresa la clave proporcionada por el administrador del sistema para extender tu membresía.
              </p>
              <form onSubmit={handleActivateMembership}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    className="input"
                    required
                    style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
                    placeholder="Paste your activation key here..."
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={activating || !activationKey}
                  >
                    {activating ? "Validando..." : "Activar"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
