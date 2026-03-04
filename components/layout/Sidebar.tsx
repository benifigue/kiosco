'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/components/ui/ThemeProvider';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/sales', label: 'Nueva Venta', icon: '🛒' },
  { href: '/products', label: 'Productos', icon: '📦' },
  { href: '/cash', label: 'Caja', icon: '💰' },
  { href: '/stats', label: 'Estadísticas', icon: '📊', adminOnly: true },
  { href: '/balance', label: 'Balance', icon: '📈', adminOnly: true },
  { href: '/users', label: 'Usuarios', icon: '👥', adminOnly: true },
  { href: '/logs', label: 'Registros', icon: '📋', adminOnly: true },
];

interface SidebarProps {
  userName: string;
  userRole: 'ADMIN' | 'COLABORADOR';
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  return (
    <nav
      style={{
        width: '220px',
        minHeight: '100vh',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '24px', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              background: 'linear-gradient(135deg, #0ea5e9, #818cf8)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            🏪
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.2,
              }}
            >
              Kiosco
            </div>
            <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.1em' }}>MANAGER</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span style={{ fontSize: '15px', width: '20px', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '8px' }}>
        {/* User */}
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>
            {userName}
          </div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: userRole === 'ADMIN' ? '#0ea5e9' : '#94a3b8',
            }}
          >
            {userRole}
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', marginBottom: '4px' }}
        >
          <span style={{ fontSize: '15px', width: '20px' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>Modo {theme === 'dark' ? 'claro' : 'oscuro'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{ width: '100%', border: 'none', background: 'none', color: '#ef4444' }}
        >
          <span style={{ fontSize: '15px', width: '20px' }}>→</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
