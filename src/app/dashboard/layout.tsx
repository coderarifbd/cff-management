'use client';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, TrendingUp, Receipt, FileText, LogOut, ShieldCheck, Megaphone, Lock } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, isManager, loading } = useAuth();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          fetch(`/api/members/${d.id}`).then(r => r.json()).then(u => {
            if (u.name) setUserName(u.name);
          }).catch(() => {});
        }
      }).catch(() => {});
  }, []);

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Members', path: '/dashboard/members', icon: <Users size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Payments', path: '/dashboard/payments', icon: <CreditCard size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Investments', path: '/dashboard/investments', icon: <TrendingUp size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Expenses', path: '/dashboard/expenses', icon: <Receipt size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Reports', path: '/dashboard/reports', icon: <FileText size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Notices', path: '/dashboard/notices', icon: <Megaphone size={20} />, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Security', path: '/dashboard/change-password', icon: <Lock size={20} />, roles: ['ADMIN', 'MANAGER'] },
  ];

  const navItems = role ? allNavItems.filter(item => item.roles.includes(role)) : [];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ width: 32, height: 32, background: isManager ? '#7c3aed' : 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>C</div>
          <span>{isManager ? 'CFF Manager' : 'CFF Admin'}</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Overview</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{userName || (isManager ? 'Manager' : 'Admin')}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                <ShieldCheck size={12} />
                {isManager ? 'Manager Role' : 'Admin Role'}
              </p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: isManager ? '#7c3aed' : 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {userName ? userName.charAt(0).toUpperCase() : (isManager ? 'M' : 'A')}
            </div>
          </div>
        </header>

        {/* Manager notice banner */}
        {isManager && (
          <div style={{ margin: '0 1.5rem 0', padding: '0.6rem 1rem', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '8px', color: '#5b21b6', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} />
            You are logged in as <strong>Manager</strong>. Some administrative actions are restricted.
          </div>
        )}

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}
