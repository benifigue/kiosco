'use client';

import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';

interface StatsData {
  daily: { totalAmount: number; totalProfit: number; count: number };
  weekly: { totalAmount: number; totalProfit: number; count: number };
  monthly: { totalAmount: number; totalProfit: number; count: number };
  custom: { totalAmount: number; totalProfit: number; count: number } | null;
  mostSold: { id: string; name: string; quantity: number; revenue: number }[];
  leastSold: { id: string; name: string; quantity: number; revenue: number }[];
  salesByUser: { id: string; name: string; username: string; totalAmount: number; totalProfit: number; count: number }[];
  monthlyComparison: { month: string; totalAmount: number; totalProfit: number }[];
  paymentMethods: { method: string; amount: number }[];
}

interface User { id: string; name: string; username: string }

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const pieRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d: User[]) => setUsers(d))
      .catch(() => {});
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) renderCharts();
  }, [stats]);

  async function loadStats() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (filterUserId) params.set('userId', filterUserId);
      const res = await fetch(`/api/stats?${params}`);
      const data = await res.json() as StatsData;
      setStats(data);
    } catch {
      console.error('Error loading stats');
    } finally {
      setLoading(false);
    }
  }

  function renderCharts() {
    if (!stats) return;

    // Dynamic import Chart.js
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default;

      // Monthly comparison chart
      if (chartRef.current) {
        const existing = Chart.getChart(chartRef.current);
        if (existing) existing.destroy();

        new Chart(chartRef.current, {
          type: 'line',
          data: {
            labels: stats.monthlyComparison.map((m) => m.month),
            datasets: [
              {
                label: 'Ventas',
                data: stats.monthlyComparison.map((m) => m.totalAmount),
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14,165,233,0.08)',
                fill: true,
                tension: 0.4,
              },
              {
                label: 'Ganancia',
                data: stats.monthlyComparison.map((m) => m.totalProfit),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.08)',
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: {
                ticks: { callback: (v) => `$${Number(v).toLocaleString('es-AR')}` },
              },
            },
          },
        });
      }

      // Payment methods pie
      if (pieRef.current) {
        const existing = Chart.getChart(pieRef.current);
        if (existing) existing.destroy();

        new Chart(pieRef.current, {
          type: 'doughnut',
          data: {
            labels: stats.paymentMethods.map((p) => p.method),
            datasets: [{
              data: stats.paymentMethods.map((p) => p.amount),
              backgroundColor: ['#0ea5e9','#10b981','#818cf8','#f59e0b','#ef4444','#6366f1'],
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'right' } },
          },
        });
      }

      // Sales by user bar
      if (barRef.current) {
        const existing = Chart.getChart(barRef.current);
        if (existing) existing.destroy();

        new Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: stats.salesByUser.map((u) => u.name),
            datasets: [
              {
                label: 'Ventas',
                data: stats.salesByUser.map((u) => u.totalAmount),
                backgroundColor: '#0ea5e9',
              },
              {
                label: 'Ganancia',
                data: stats.salesByUser.map((u) => u.totalProfit),
                backgroundColor: '#10b981',
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: {
                ticks: { callback: (v) => `$${Number(v).toLocaleString('es-AR')}` },
              },
            },
          },
        });
      }
    });
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ minWidth: '200px' }}>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px' }}>Estadísticas</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Solo visible para administradores</p>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '150px' }} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '150px' }} />
          </div>
          <div>
            <label className="label">Colaborador</label>
            <select className="input" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} style={{ width: '160px' }}>
              <option value="">Todos</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={loadStats}>Filtrar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Cargando estadísticas...
        </div>
      ) : stats ? (
        <>
          {/* Period stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Hoy', data: stats.daily },
              { label: 'Esta semana', data: stats.weekly },
              { label: 'Este mes', data: stats.monthly },
              ...(stats.custom ? [{ label: 'Período filtrado', data: stats.custom, isCustom: true }] : []),
            ].map(({ label, data, isCustom }) => (
              <div key={label} className={isCustom ? "stat-card" : "card"}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isCustom ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '12px' }}>{label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{formatCurrency(data.totalAmount)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>en ventas</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--success)' }}>{formatCurrency(data.totalProfit)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ganancia</div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>{data.count} transacciones</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="card" style={{ minWidth: 0 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>Comparación mensual</h3>
              <canvas ref={chartRef} />
            </div>
            <div className="card" style={{ minWidth: 0 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>Por método de pago</h3>
              <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                <canvas ref={pieRef} />
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>🔝 Más vendidos</h3>
              {stats.mostSold.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.mostSold.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', width: '20px' }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{p.quantity} u.</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ margin: '0 0 12px', fontSize: '14px' }}>📉 Menos vendidos</h3>
              {stats.leastSold.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.leastSold.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', width: '20px' }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{p.quantity} u.</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatCurrency(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By user chart */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: '14px' }}>Ventas por colaborador</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ minWidth: 0 }}>
                <canvas ref={barRef} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Transacciones</th>
                        <th>Total</th>
                        <th>Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.salesByUser.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.name}</td>
                          <td>{u.count}</td>
                          <td>{formatCurrency(u.totalAmount)}</td>
                          <td style={{ color: 'var(--success)' }}>{formatCurrency(u.totalProfit)}</td>
                        </tr>
                      ))}
                      {stats.salesByUser.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Sin datos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
