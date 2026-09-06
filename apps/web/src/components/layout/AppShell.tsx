'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, ReactNode, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { APP_NAME, NAV_ITEMS } from '../../constants/navigation';
import { can } from '../../lib/operational';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const initials = user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'B7';

  function onSearch(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B7</span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>PLATFORM</small>
          </div>
        </div>
        <nav>
          {NAV_ITEMS.filter((item) => can(user, item.permission)).map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? 'nav-link active' : 'nav-link'}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <strong>Energia hoje</strong>
          <span>Um futuro melhor</span>
        </div>
      </aside>
      <div className="app-main">
        <div className="topbar">
          <form className="search" onSubmit={onSearch} role="search">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar usinas, clientes ou equipamentos..."
              aria-label="Buscar usinas, clientes ou equipamentos"
            />
          </form>
          <div className="topbar-actions">
            <button type="button" className="icon-btn" aria-label="Notificações">
              <span aria-hidden="true">●</span>
            </button>
            <div className="user-chip">
              <span className="avatar" aria-hidden="true">{initials}</span>
              <div>
                <strong>{user?.name}</strong>
                <small>{user?.profileLabel}</small>
              </div>
            </div>
            <button type="button" className="ui-button ui-button-secondary" onClick={logout}>
              Sair
            </button>
            <span className="status">Sistema operacional</span>
          </div>
        </div>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
