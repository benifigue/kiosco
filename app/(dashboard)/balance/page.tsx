'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface BalanceData {
  totalSales: number;
  totalProfit: number;
  totalCost: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
}

export default function BalancePage() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadBalance();
  }, []);

  async function loadBalance() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/balance?${params}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Error al cargar balance");
        return;
      }
      
      setBalance(data as BalanceData);
    } catch {
      setError('Error de conexión al cargar balance');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px' }}>Balance General</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Resumen financiero</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '150px' }} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '150px' }} />
          </div>
          <button className="btn btn-primary" onClick={loadBalance}>Aplicar</button>
          <button className="btn btn-ghost" onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(loadBalance, 10); }}>Todo</button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Funcionalidad Premium</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '450px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            {error}. El balance detallado está disponible exclusivamente para usuarios PREMIUM.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/settings'}
          >
            Ver Planes de Suscripción
          </button>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Cargando...
        </div>
      ) : balance ? (
        <>
          {/* Main balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <BalCard label="Total Ventas" value={formatCurrency(balance.totalSales)} sub={`${balance.salesCount} transacciones`} color="#0ea5e9" icon="💰" />
            <BalCard label="Ganancia Bruta" value={formatCurrency(balance.totalProfit)} sub={`${balance.totalSales > 0 ? ((balance.totalProfit / balance.totalSales) * 100).toFixed(1) : 0}% margen`} color="#10b981" icon="📈" />
            <BalCard label="Ganancia Neta" value={formatCurrency(balance.netProfit)} sub="después de gastos" color={balance.netProfit >= 0 ? '#10b981' : '#ef4444'} icon="✨" large />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <BalCard label="Costo de Mercadería" value={formatCurrency(balance.totalCost)} sub="costo total" color="#818cf8" icon="📦" />
            <BalCard label="Ingresos Extra" value={formatCurrency(balance.totalIncome)} sub="ingresos manuales" color="#f59e0b" icon="↑" />
            <BalCard label="Egresos/Gastos" value={formatCurrency(balance.totalExpenses)} sub="gastos registrados" color="#ef4444" icon="↓" />
          </div>

          {/* Summary table */}
          <div className="card" style={{ maxWidth: '500px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px' }}>Resumen de cuentas</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'Ventas totales', value: balance.totalSales, color: 'var(--text-primary)' },
                  { label: '— Costo de mercadería', value: -balance.totalCost, color: 'var(--danger)' },
                  { label: '= Ganancia bruta', value: balance.totalProfit, color: 'var(--success)', bold: true },
                  { label: '+ Ingresos adicionales', value: balance.totalIncome, color: 'var(--success)' },
                  { label: '— Gastos registrados', value: -balance.totalExpenses, color: 'var(--danger)' },
                  { label: '= GANANCIA NETA', value: balance.netProfit, color: balance.netProfit >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, large: true },
                ].map(({ label, value, color, bold, large }) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 0', fontSize: large ? '14px' : '13px', fontWeight: bold ? 700 : 400, color: 'var(--text-primary)' }}>
                      {label}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontSize: large ? '16px' : '13px', fontWeight: bold ? 700 : 600, color }}>
                      {value >= 0 ? formatCurrency(value) : `−${formatCurrency(Math.abs(value))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BalCard({ label, value, sub, color, icon, large }: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
  large?: boolean;
}) {
  return (
    <div className="stat-card" style={{ ['--accent' as string]: color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: large ? '28px' : '22px', fontWeight: 700, fontFamily: 'var(--font-display)', color, marginBottom: '4px' }}>{value}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sub}</div>
        </div>
        <div style={{ fontSize: '24px', opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}
