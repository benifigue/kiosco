import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency, getStartOfDay, getEndOfDay, getStartOfMonth, getEndOfMonth } from '@/lib/utils';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();

  const [
    todaySales,
    monthSales,
    lowStockProducts,
    openRegister,
    recentSales,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: { gte: getStartOfDay(now), lte: getEndOfDay(now) },
        ...(user.role === 'COLABORADOR' ? { userId: user.id } : {}),
      },
    }),
    prisma.sale.findMany({
      where: {
        createdAt: { gte: getStartOfMonth(now), lte: getEndOfMonth(now) },
        ...(user.role === 'COLABORADOR' ? { userId: user.id } : {}),
      },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { lte: prisma.product.fields.minStock } },
      orderBy: { stock: 'asc' },
      take: 5,
    }).catch(() =>
      prisma.product.findMany({
        where: { active: true },
        orderBy: { stock: 'asc' },
        take: 5,
      })
    ),
    prisma.cashRegister.findFirst({ where: { closedAt: null } }),
    prisma.sale.findMany({
      where: user.role === 'COLABORADOR' ? { userId: user.id } : {},
      include: {
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const todayTotal = todaySales.reduce((s, x) => s + x.totalAmount, 0);
  const todayProfit = todaySales.reduce((s, x) => s + x.totalProfit, 0);
  const monthTotal = monthSales.reduce((s, x) => s + x.totalAmount, 0);
  const monthProfit = monthSales.reduce((s, x) => s + x.totalProfit, 0);

  // Low stock: filter manually since Prisma SQLite doesn't support field comparison
  const allActive = await prisma.product.findMany({
    where: { active: true },
    orderBy: { stock: 'asc' },
  });
  const lowStock = allActive.filter((p) => p.stock <= p.minStock).slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 4px', color: 'var(--text-primary)' }}>
          Bienvenido, {user.name} 👋
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
          {now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Caja status */}
      {!openRegister && (
        <div
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }}>
            ⚠️ No hay caja abierta
          </span>
          <Link href="/cash" className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 12px' }}>
            Abrir caja
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard title="Ventas hoy" value={formatCurrency(todayTotal)} sub={`${todaySales.length} transacciones`} color="#0ea5e9" />
        <StatCard title="Ganancia hoy" value={formatCurrency(todayProfit)} sub={`${todayTotal > 0 ? ((todayProfit / todayTotal) * 100).toFixed(1) : 0}% margen`} color="#10b981" />
        <StatCard title="Ventas del mes" value={formatCurrency(monthTotal)} sub={`${monthSales.length} transacciones`} color="#818cf8" />
        <StatCard title="Ganancia del mes" value={formatCurrency(monthProfit)} sub="ganancia neta" color="#f59e0b" />
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Recent sales */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Últimas ventas</h3>
            <Link href="/sales" className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }}>Ver todas</Link>
          </div>
          <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vendedor</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Sin ventas aún
                    </td>
                  </tr>
                )}
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      #{sale.id.slice(-6)}
                    </td>
                    <td>{sale.user.name}</td>
                    <td>{sale.items.length}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(sale.totalAmount)}</td>
                    <td>
                      <span className="badge badge-info">{sale.paymentMethod}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {new Date(sale.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Stock bajo</h3>
            <Link href="/products" className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }}>Productos</Link>
          </div>
          <div style={{ padding: '8px' }}>
            {lowStock.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', margin: 0 }}>
                ✅ Todo en stock
              </p>
            ) : (
              lowStock.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    background: p.stock === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mín: {p.minStock}</div>
                  </div>
                  <span className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                    {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div className="stat-card" style={{ ['--accent' as string]: color }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}
