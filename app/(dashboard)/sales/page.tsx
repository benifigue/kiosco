'use client';

import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  internalCode: string | null;
  category: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  minStock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const PAYMENT_METHODS = ['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'MODO', 'MERCADOPAGO'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

export default function SalesPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; totalAmount: number; change: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (search.length < 1) {
      setSearchResults([]);
      return;
    }
    const q = search.toLowerCase();
    const results = products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode ?? '').includes(q) ||
      (p.internalCode ?? '').toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
  }, [search, products]);

  async function loadProducts() {
    try {
      const res = await fetch('/api/products?active=true');
      const data = await res.json() as Product[];
      setProducts(data);
    } catch {
      showToast('Error al cargar productos', 'error');
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSearch('');
    setSearchResults([]);
    searchRef.current?.focus();
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  const totalAmount = cart.reduce((s, i) => s + i.product.salePrice * i.quantity, 0);
  const totalCost = cart.reduce((s, i) => s + i.product.purchasePrice * i.quantity, 0);
  const totalProfit = totalAmount - totalCost;
  const change = paymentMethod === 'EFECTIVO' && cashReceived ? Math.max(0, Number(cashReceived) - totalAmount) : 0;

  async function confirmSale() {
    if (cart.length === 0) {
      showToast('El carrito está vacío', 'error');
      return;
    }
    if (paymentMethod === 'EFECTIVO' && cashReceived && Number(cashReceived) < totalAmount) {
      showToast('El monto recibido es insuficiente', 'error');
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            salePrice: i.product.salePrice,
            purchasePrice: i.product.purchasePrice,
          })),
          paymentMethod,
        }),
      });

      const data = await res.json() as { id?: string; totalAmount?: number; error?: string };

      if (!res.ok) {
        showToast(data.error ?? 'Error al registrar venta', 'error');
        return;
      }

      setLastSale({
        id: data.id ?? '',
        totalAmount,
        change,
      });
      setShowSuccess(true);
      setCart([]);
      setCashReceived('');
      setPaymentMethod('EFECTIVO');
      loadProducts(); // refresh stock
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', height: 'calc(100vh - 56px)' }}>
      {/* Left: product search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: '0 0 16px' }}>Nueva Venta</h1>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              className="input"
              placeholder="🔍 Buscar producto por nombre, código de barras o interno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  marginTop: '4px',
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                }}
              >
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {p.name}
                        {p.stock === 0 && <span style={{ marginLeft: '8px', color: 'var(--danger)', fontSize: '11px' }}>⚠ Sin stock</span>}
                        {p.stock > 0 && p.stock <= p.minStock && <span style={{ marginLeft: '8px', color: 'var(--warning)', fontSize: '11px' }}>⚡ Stock bajo</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.category} • Stock: {p.stock}
                        {p.barcode && ` • ${p.barcode}`}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '14px', flexShrink: 0, marginLeft: '12px' }}>
                      {formatCurrency(p.salePrice)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart items */}
        <div className="card" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          {cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛒</div>
              <p style={{ margin: 0 }}>Busca y agrega productos al carrito</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Stock disponible: {item.product.stock}
                        {item.product.stock === 0 && <span style={{ color: 'var(--danger)' }}> ⚠ Sin stock</span>}
                      </div>
                    </td>
                    <td>{formatCurrency(item.product.salePrice)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', minWidth: '28px' }}
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >−</button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                          style={{
                            width: '48px',
                            textAlign: 'center',
                            padding: '4px',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        />
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '2px 8px', minWidth: '28px' }}
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >+</button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(item.product.salePrice * item.quantity)}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => removeFromCart(item.product.id)}
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: payment panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content', position: 'sticky', top: '0' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>Resumen de venta</h2>

        {/* Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal ({cart.length} items)</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Costo</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)' }}>
            <span>Ganancia</span>
            <span>{formatCurrency(totalProfit)}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>TOTAL</span>
            <span style={{ fontWeight: 700, fontSize: '20px', fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="label">Método de pago</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: `2px solid ${paymentMethod === method ? 'var(--accent)' : 'var(--border)'}`,
                  background: paymentMethod === method ? 'rgba(14,165,233,0.08)' : 'var(--bg)',
                  color: paymentMethod === method ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'all 0.1s',
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Cash received */}
        {paymentMethod === 'EFECTIVO' && (
          <div>
            <label className="label">Efectivo recibido</label>
            <input
              className="input"
              type="number"
              min={totalAmount}
              step="0.01"
              placeholder={formatCurrency(totalAmount)}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
            />
            {cashReceived && (
              <div style={{ marginTop: '8px', padding: '10px 12px', background: Number(cashReceived) >= totalAmount ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vuelto</span>
                  <span style={{ color: Number(cashReceived) >= totalAmount ? 'var(--success)' : 'var(--danger)' }}>
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px' }}
          onClick={confirmSale}
          disabled={confirming || cart.length === 0}
        >
          {confirming ? (
            <><div className="spinner" style={{ width: '16px', height: '16px' }} /> Procesando...</>
          ) : (
            '✓ Confirmar venta'
          )}
        </button>

        {cart.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', fontSize: '13px' }}
            onClick={() => setCart([])}
          >
            🗑 Limpiar carrito
          </button>
        )}
      </div>

      {/* Success modal */}
      {showSuccess && lastSale && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px' }}>¡Venta registrada!</h2>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 16px', fontSize: '13px' }}>
              Venta #{lastSale.id.slice(-6)}
            </p>
            <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total cobrado</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(lastSale.totalAmount)}</span>
              </div>
              {lastSale.change > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vuelto</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(lastSale.change)}</span>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => { setShowSuccess(false); searchRef.current?.focus(); }}
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
