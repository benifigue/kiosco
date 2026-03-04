'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

interface LogEntry {
  id: string;
  action: string;
  createdAt: string;
  user: { id: string; name: string; username: string };
}

interface User { id: string; name: string; username: string }

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((d: User[]) => setUsers(d))
      .catch(() => {});
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (filterUserId) params.set('userId', filterUserId);
      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json() as LogEntry[];
      setLogs(data);
    } catch {
      console.error('Error loading logs');
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter((l) =>
    search.length === 0 ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user.name.toLowerCase().includes(search.toLowerCase()) ||
    l.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px' }}>Registros del sistema</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>{filtered.length} entradas</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '140px' }} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '140px' }} />
          </div>
          <div>
            <label className="label">Usuario</label>
            <select className="input" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} style={{ width: '150px' }}>
              <option value="">Todos</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={loadLogs}>Filtrar</button>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          className="input"
          style={{ maxWidth: '360px' }}
          placeholder="Buscar en acciones..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Cargando...
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Sin registros
                  </td>
                </tr>
              )}
              {filtered.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{log.user.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user.username}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
