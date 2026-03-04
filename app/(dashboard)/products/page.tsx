"use client";

import { useState, useEffect, FormEvent } from "react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  active: boolean;
}

const EMPTY_FORM = {
  name: "",
  barcode: "",
  internalCode: "",
  category: "",
  purchasePrice: "",
  salePrice: "",
  stock: "",
  minStock: "",
};

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("COLABORADOR");
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user?: { role: string } }) => {
        if (d.user) setUserRole(d.user.role);
      })
      .catch(() => {});
    loadProducts();
  }, [showInactive]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?active=${!showInactive}`);
      const data = (await res.json()) as Product[];
      setProducts(data);
    } catch {
      showToast("Error al cargar productos", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode ?? "").includes(q) ||
      (p.internalCode ?? "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      barcode: p.barcode ?? "",
      internalCode: p.internalCode ?? "",
      category: p.category,
      purchasePrice: String(p.purchasePrice),
      salePrice: String(p.salePrice),
      stock: String(p.stock),
      minStock: String(p.minStock),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      internalCode: form.internalCode || undefined,
      category: form.category,
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.salePrice),
      stock: Number(form.stock),
      minStock: Number(form.minStock),
    };

    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Error", "error");
        return;
      }

      showToast(
        editing ? "Producto actualizado" : "Producto creado",
        "success",
      );
      setShowModal(false);
      loadProducts();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) {
        showToast("Error al actualizar", "error");
        return;
      }
      showToast(
        p.active ? "Producto desactivado" : "Producto activado",
        "success",
      );
      loadProducts();
    } catch {
      showToast("Error de conexión", "error");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", margin: "0 0 4px" }}>Productos</h1>
          <p
            style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}
          >
            {filtered.length} productos
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Ver inactivos
          </label>
          {userRole === "ADMIN" && (
            <button className="btn btn-primary" onClick={openCreate}>
              + Nuevo producto
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "16px" }}>
        <input
          className="input"
          style={{ maxWidth: "400px" }}
          placeholder="Buscar por nombre, código de barras, código interno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--text-muted)",
          }}
        >
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          Cargando...
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Cod. Barras</th>
                <th>Cod. Interno</th>
                <th>P. Compra</th>
                <th>P. Venta</th>
                <th>Margen</th>
                <th>Stock</th>
                <th>Estado</th>
                {userRole === "ADMIN" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Sin productos
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const margin =
                  p.salePrice > 0
                    ? (
                        ((p.salePrice - p.purchasePrice) / p.salePrice) *
                        100
                      ).toFixed(1)
                    : "0";
                const stockStatus =
                  p.stock === 0
                    ? "danger"
                    : p.stock <= p.minStock
                      ? "warning"
                      : "success";
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span className="badge badge-neutral">{p.category}</span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                      }}
                    >
                      {p.barcode ?? "—"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                      }}
                    >
                      {p.internalCode ?? "—"}
                    </td>
                    <td>{formatCurrency(p.purchasePrice)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(p.salePrice)}
                    </td>
                    <td style={{ color: "var(--success)" }}>{margin}%</td>
                    <td>
                      <span className={`badge badge-${stockStatus}`}>
                        {p.stock === 0
                          ? "⚠ Sin stock"
                          : p.stock <= p.minStock
                            ? `⚡ ${p.stock}`
                            : p.stock}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${p.active ? "badge-success" : "badge-neutral"}`}
                      >
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {userRole === "ADMIN" && (
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            onClick={() => openEdit(p)}
                          >
                            Editar
                          </button>
                          <button
                            className={`btn ${p.active ? "btn-danger" : "btn-success"}`}
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            onClick={() => handleToggleActive(p)}
                          >
                            {p.active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>
              {editing ? "Editar producto" : "Nuevo producto"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div style={{ gridColumn: "1/-1" }}>
                  <label className="label">Nombre *</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Categoría *</label>
                  <input
                    className="input"
                    required
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Cód. de Barras</label>
                  <input
                    className="input"
                    value={form.barcode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, barcode: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Cód. Interno</label>
                  <input
                    className="input"
                    value={form.internalCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, internalCode: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Precio Compra *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.purchasePrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, purchasePrice: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Precio Venta *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.salePrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, salePrice: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Stock *</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stock: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">Stock Mínimo *</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    required
                    value={form.minStock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minStock: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Margin preview */}
              {form.salePrice && form.purchasePrice && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    background: "var(--bg)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                >
                  Ganancia por unidad:{" "}
                  {formatCurrency(
                    Number(form.salePrice) - Number(form.purchasePrice),
                  )}{" "}
                  &nbsp; (
                  {Number(form.salePrice) > 0
                    ? (
                        ((Number(form.salePrice) - Number(form.purchasePrice)) /
                          Number(form.salePrice)) *
                        100
                      ).toFixed(1)
                    : 0}
                  % margen)
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "20px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Guardando..."
                    : editing
                      ? "Guardar cambios"
                      : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
