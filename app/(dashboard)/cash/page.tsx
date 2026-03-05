"use client";

import { useState, useEffect, FormEvent } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export const dynamic = "force-dynamic";

interface CashRegister {
  id: string;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  currentBalance?: number;
  transferTotal?: number;
  cardTotal?: number;
  openedAt: string;
  closedAt: string | null;
  openedBy: { id: string; name: string; username: string };
}

interface User {
  id: string;
  name: string;
  role: "ADMIN" | "COLABORADOR";
}

interface CashMovement {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  createdAt: string;
  user: { name: string; username: string };
}

export default function CashPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [openRegister, setOpenRegister] = useState<CashRegister | null | false>(
    false,
  ); // false = loading
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [tab, setTab] = useState<"current" | "movements" | "history">(
    "current",
  );
  const [selectedRegister, setSelectedRegister] = useState<any>(null);

  // Forms
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [movType, setMovType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [movAmount, setMovAmount] = useState("");
  const [movDesc, setMovDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      // Some APIs might wrap in { user: ... }, some might return user directly
      const userData = data?.user || data;
      if (userData && userData.role) {
        setUser(userData);
      }
    } catch {
      console.error("Error loading user");
    }
  }

  async function loadAll() {
    await Promise.all([loadOpenRegister(), loadHistory(), loadMovements()]);
  }

  async function loadOpenRegister() {
    try {
      const res = await fetch("/api/cash-register?open=true");
      const data = await res.json();
      // The API might return { error: ... } or the register directly
      if (res.ok) {
        setOpenRegister(data as CashRegister | null);
      } else {
        setOpenRegister(null);
      }
    } catch {
      setOpenRegister(null);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch("/api/cash-register");
      const data = await res.json();
      if (res.ok) {
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  async function loadMovements() {
    try {
      const res = await fetch("/api/cash-movements");
      const data = await res.json();
      if (res.ok) {
        setMovements(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  async function loadDetail(id: string) {
    if (!user) {
      showToast("Cargando información de usuario...", "info");
      return;
    }

    const role = user.role?.toString().toUpperCase().trim();
    if (role !== "ADMIN") {
      showToast(`Acceso denegado: Su rol (${role || 'desconocido'}) no es ADMINISTRADOR`, "error");
      return;
    }

    try {
      const res = await fetch(`/api/cash-register/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSelectedRegister(data);
    } catch (err: any) {
      showToast(err.message || "Error al cargar detalle", "error");
    }
  }

  async function handleOpenRegister(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingAmount: Number(openingAmount) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Error", "error");
        return;
      }
      showToast("Caja abierta", "success");
      setOpeningAmount("");
      loadAll();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseRegister(e: FormEvent) {
    e.preventDefault();
    if (!openRegister) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cash-register/${openRegister.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingAmount: Number(closingAmount) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Error", "error");
        return;
      }
      showToast("Caja cerrada", "success");
      setClosingAmount("");
      loadAll();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movType,
          amount: Number(movAmount),
          description: movDesc,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Error", "error");
        return;
      }
      showToast("Movimiento registrado", "success");
      setMovAmount("");
      setMovDesc("");
      loadMovements();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  // Calculate current balance from movements since opening
  const sessionMovements = openRegister 
    ? movements.filter(m => new Date(m.createdAt) >= new Date(openRegister.openedAt))
    : [];

  const totalIncome = sessionMovements.reduce(
    (s, m) => (m.type === "INCOME" ? s + m.amount : s),
    0,
  );
  const totalExpense = sessionMovements.reduce(
    (s, m) => (m.type === "EXPENSE" ? s + m.amount : s),
    0,
  );

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", margin: "0 0 4px" }}>Control de Caja</h1>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "4px",
          width: "fit-content",
        }}
      >
        {(["current", "movements", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              background: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "white" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {t === "current"
              ? "💰 Caja actual"
              : t === "movements"
                ? "↕ Movimientos"
                : "📋 Historial"}
          </button>
        ))}
      </div>

      {/* Current tab */}
      {tab === "current" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {/* Status card */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "15px" }}>
              {openRegister ? "✅ Caja abierta" : "🔒 Caja cerrada"}
            </h3>

            {openRegister && (
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg)",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Apertura
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {formatCurrency(openRegister.openingAmount)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg)",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {user?.role === "ADMIN" ? "Ingresos (Efectivo)" : "Transferencia"}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                        color: "var(--success)",
                      }}
                    >
                      {formatCurrency(
                        user?.role === "ADMIN" ? totalIncome : (openRegister.transferTotal ?? 0)
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg)",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Egresos
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                        color: "var(--danger)",
                      }}
                    >
                      {formatCurrency(totalExpense)}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "rgba(14,165,233,0.08)",
                      borderRadius: "8px",
                      border: "1px solid rgba(14,165,233,0.2)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {user?.role === "ADMIN" ? "Esperado (Efectivo)" : "Tarjeta"}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontFamily: "var(--font-display)",
                        color: "var(--accent)",
                      }}
                    >
                      {formatCurrency(
                        user?.role === "ADMIN"
                          ? (openRegister.currentBalance ?? (openRegister.openingAmount + totalIncome - totalExpense))
                          : (openRegister.cardTotal ?? 0)
                      )}
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  Abierta por {openRegister.openedBy.name} —{" "}
                  {formatDate(openRegister.openedAt)}
                </p>
              </div>
            )}

            {!openRegister && openRegister !== false && (
              <form onSubmit={handleOpenRegister}>
                <label className="label">Monto de apertura</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  style={{ marginBottom: "12px" }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={saving}
                >
                  {saving ? "Abriendo..." : "🔓 Abrir caja"}
                </button>
              </form>
            )}
          </div>

          {/* Close register */}
          {openRegister && (
            <div className="card">
              <h3 style={{ margin: "0 0 16px", fontSize: "15px" }}>
                Cerrar caja
              </h3>
              <form onSubmit={handleCloseRegister}>
                <label className="label">Monto en caja (conteo físico)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  style={{ marginBottom: "12px" }}
                />
                {closingAmount && user?.role === "ADMIN" && (
                  <div
                    style={{
                      marginBottom: "12px",
                      padding: "10px 12px",
                      background: "var(--bg)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Esperado
                      </span>
                      <span>
                        {formatCurrency(
                          openRegister.currentBalance ??
                            openRegister.openingAmount +
                              totalIncome -
                              totalExpense,
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>
                        Diferencia
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            Math.abs(
                              Number(closingAmount) -
                                (openRegister.currentBalance ??
                                  openRegister.openingAmount +
                                    totalIncome -
                                    totalExpense),
                            ) < 0.01
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {formatCurrency(
                          Number(closingAmount) -
                            (openRegister.currentBalance ??
                              openRegister.openingAmount +
                                totalIncome -
                                totalExpense),
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ width: "100%" }}
                  disabled={saving}
                >
                  {saving ? "Cerrando..." : "🔒 Cerrar caja"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Movements tab */}
      {tab === "movements" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "20px",
          }}
        >
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: "15px" }}>
              Registrar movimiento
            </h3>
            <form onSubmit={handleMovement}>
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Tipo</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMovType("INCOME")}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: `2px solid ${movType === "INCOME" ? "var(--success)" : "var(--border)"}`,
                      background:
                        movType === "INCOME"
                          ? "rgba(16,185,129,0.08)"
                          : "var(--bg)",
                      color:
                        movType === "INCOME"
                          ? "var(--success)"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    ↑ Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovType("EXPENSE")}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: `2px solid ${movType === "EXPENSE" ? "var(--danger)" : "var(--border)"}`,
                      background:
                        movType === "EXPENSE"
                          ? "rgba(239,68,68,0.08)"
                          : "var(--bg)",
                      color:
                        movType === "EXPENSE"
                          ? "var(--danger)"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    ↓ Egreso
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label className="label">Monto</label>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Descripción</label>
                <input
                  className="input"
                  required
                  value={movDesc}
                  onChange={(e) => setMovDesc(e.target.value)}
                  placeholder="Ej: Pago proveedor, compra de insumos..."
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Registrar"}
              </button>
            </form>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Sin movimientos
                    </td>
                  </tr>
                )}
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span
                        className={`badge ${m.type === "INCOME" ? "badge-success" : "badge-danger"}`}
                      >
                        {m.type === "INCOME" ? "↑ Ingreso" : "↓ Egreso"}
                      </span>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          m.type === "INCOME"
                            ? "var(--success)"
                            : "var(--danger)",
                      }}
                    >
                      {formatCurrency(m.amount)}
                    </td>
                    <td>{m.description}</td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}
                    >
                      {m.user.name}
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}
                    >
                      {formatDate(m.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Cierre</th>
                <th>Monto apertura</th>
                {user?.role === "ADMIN" && <th>Monto esperado</th>}
                <th>Monto real</th>
                {user?.role === "ADMIN" && <th>Diferencia</th>}
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={user?.role === "ADMIN" ? 8 : 6}
                    style={{
                      textAlign: "center",
                      padding: "24px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Sin historial
                  </td>
                </tr>
              )}
              {history.map((r) => (
                <tr
                  key={r.id}
                  onDoubleClick={() => loadDetail(r.id)}
                  style={{ cursor: "pointer" }}
                  title="Doble clic para ver detalles"
                >
                  <td style={{ fontSize: "12px" }}>{formatDate(r.openedAt)}</td>
                  <td style={{ fontSize: "12px" }}>
                    {r.closedAt ? formatDate(r.closedAt) : "—"}
                  </td>
                  <td>{formatCurrency(r.openingAmount)}</td>
                  {user?.role === "ADMIN" && (
                    <td>
                      {r.expectedAmount != null
                        ? formatCurrency(r.expectedAmount)
                        : "—"}
                    </td>
                  )}
                  <td>
                    {r.closingAmount != null
                      ? formatCurrency(r.closingAmount)
                      : "—"}
                  </td>
                  {user?.role === "ADMIN" && (
                    <td
                      style={{
                        fontWeight: 600,
                        color:
                          r.difference != null
                            ? Math.abs(r.difference) < 0.01
                              ? "var(--success)"
                              : r.difference < 0
                                ? "var(--danger)"
                                : "var(--warning)"
                            : "var(--text-muted)",
                      }}
                    >
                      {r.difference != null
                        ? formatCurrency(r.difference)
                        : "—"}
                    </td>
                  )}
                  <td>{r.openedBy.name}</td>
                  <td>
                    <span
                      className={`badge ${r.closedAt ? "badge-neutral" : "badge-success"}`}
                    >
                      {r.closedAt ? "Cerrada" : "Abierta"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Detail Modal */}
      {selectedRegister && (
        <div className="modal-overlay" onClick={() => setSelectedRegister(null)}>
          <div
            className="modal"
            style={{ maxWidth: "900px", width: "95%", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--border)",
                paddingBottom: "12px",
              }}
            >
              <h2 style={{ margin: 0 }}>Detalle de Caja</h2>
              <button className="btn btn-ghost" onClick={() => setSelectedRegister(null)}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
              <div className="card" style={{ background: "var(--bg)" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Información General</h4>
                <div style={{ fontSize: "13px", display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Apertura:</span>
                    <span>{formatDate(selectedRegister.openedAt)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Cierre:</span>
                    <span>{selectedRegister.closedAt ? formatDate(selectedRegister.closedAt) : "En curso"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Responsable:</span>
                    <span>{selectedRegister.openedBy.name}</span>
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: "var(--bg)" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Resumen de Valores</h4>
                <div style={{ fontSize: "13px", display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Efectivo (Ventas + Movimientos):</span>
                    <span>{formatCurrency(selectedRegister.totals.cash + selectedRegister.totals.income - selectedRegister.totals.expense)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Transferencias / QR:</span>
                    <span>{formatCurrency(selectedRegister.totals.transfer)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Tarjetas:</span>
                    <span>{formatCurrency(selectedRegister.totals.card)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: "6px", marginTop: "4px" }}>
                    <span>TOTAL OPERADO:</span>
                    <span>{formatCurrency(selectedRegister.totals.cash + selectedRegister.totals.transfer + selectedRegister.totals.card + selectedRegister.totals.income - selectedRegister.totals.expense)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Ventas ({selectedRegister.sales.length})</h4>
                <div className="table-wrapper" style={{ maxHeight: "300px", overflow: "auto" }}>
                  <table style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Total</th>
                        <th>Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRegister.sales.map((s: any) => (
                        <tr key={s.id}>
                          <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(s.totalAmount)}</td>
                          <td><span className="badge badge-info" style={{ fontSize: "10px" }}>{s.paymentMethod}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Movimientos ({selectedRegister.movements.length})</h4>
                <div className="table-wrapper" style={{ maxHeight: "300px", overflow: "auto" }}>
                  <table style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Monto</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRegister.movements.map((m: any) => (
                        <tr key={m.id}>
                          <td>
                            <span className={`badge ${m.type === "INCOME" ? "badge-success" : "badge-danger"}`} style={{ fontSize: "10px" }}>
                              {m.type === "INCOME" ? "↑" : "↓"}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: m.type === "INCOME" ? "var(--success)" : "var(--danger)" }}>
                            {formatCurrency(m.amount)}
                          </td>
                          <td style={{ fontSize: "11px" }}>{m.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
