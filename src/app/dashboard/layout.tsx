'use client';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, CreditCard, TrendingUp, 
  Receipt, FileText, LogOut, ShieldCheck, 
  Megaphone, Lock, Wallet, X, Menu, Bell, Settings
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isAdmin, isManager, hasPermission, loading } = useAuth();
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  const allNavItems = [
    { name: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={20} />, key: 'overview' },
    { name: 'Members', path: '/dashboard/members', icon: <Users size={20} />, key: 'members' },
    { name: 'Payments', path: '/dashboard/payments', icon: <CreditCard size={20} />, key: 'payments' },
    { name: 'Investments', path: '/dashboard/investments', icon: <TrendingUp size={20} />, key: 'investments' },
    { name: 'Expenses', path: '/dashboard/expenses', icon: <Receipt size={20} />, key: 'expenses' },
    { name: 'Other Incomes', path: '/dashboard/incomes', icon: <Wallet size={20} />, key: 'incomes' },
    { name: 'Reports', path: '/dashboard/reports', icon: <FileText size={20} />, key: 'reports' },
    { name: 'Notices', path: '/dashboard/notices', icon: <Megaphone size={20} />, key: 'notices' },
    { name: 'Security', path: '/dashboard/change-password', icon: <Lock size={20} />, key: 'security' },
    { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={20} />, key: 'settings' },
  ];

  const navItems = role ? allNavItems.filter(item => {
    if (item.key === 'security') return true;
    return hasPermission(item.key, 'VIEW');
  }) : [];

  const currentNav = allNavItems
    .filter(item => item.path !== '/dashboard')
    .find(item => pathname.startsWith(item.path)) 
    || allNavItems.find(item => item.path === '/dashboard');
  const hasAccess = role 
    ? (currentNav ? (currentNav.key === 'security' || hasPermission(currentNav.key, 'VIEW')) : true)
    : false;

  const currentRouteName = currentNav?.name || 'Dashboard';

  return (
    <div className="layout">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ 
            width: 38, 
            height: 38, 
            background: isManager ? 'linear-gradient(135deg, #7c3aed, #4c1d95)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))', 
            borderRadius: 10, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 800,
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>C</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.2 }}>CFF Panel</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{isManager ? 'Manager Dashboard' : 'Administrator'}</span>
          </div>
          <button className="mobile-close" onClick={() => setIsSidebarOpen(false)} style={{ color: 'white', background: 'transparent', border: 'none' }}><X size={24} /></button>
        </div>
        
        <nav className="sidebar-nav">
          <div style={{ padding: '0 1rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Main Menu</div>
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

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', border: 'none', background: 'rgba(239, 68, 68, 0.05)', cursor: 'pointer', textAlign: 'left', color: '#ef4444' }}>
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button className="mobile-toggle" onClick={() => setIsSidebarOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{currentRouteName}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Bell size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: isManager ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'linear-gradient(135deg, var(--primary-light), var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {userName ? userName.charAt(0).toUpperCase() : (isManager ? 'M' : 'A')}
              </div>
              <div className="user-info-text" style={{ paddingRight: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>{userName || (isManager ? 'Manager' : 'Admin')}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck size={10} />
                  {isManager ? 'Manager' : 'Administrator'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Manager notice banner */}
        {isManager && (
          <div style={{ margin: '1.5rem 2.5rem 0', padding: '0.75rem 1.25rem', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: 12, color: '#a78bfa', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backdropFilter: 'blur(10px)' }}>
            <ShieldCheck size={16} />
            <span>You are logged in as <strong>Manager</strong>. Some administrative actions are restricted for your role.</span>
          </div>
        )}

        <div className="page-content">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: 'var(--text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ marginBottom: '1rem' }}></div>
                <p>Checking permissions...</p>
              </div>
            </div>
          ) : !hasAccess ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: '4rem auto' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Lock size={32} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Access Denied</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You do not have the required permissions to view the <strong>{currentRouteName}</strong> module.</p>
              <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ display: 'inline-flex' }}>
                Go to Overview
              </button>
            </div>
          ) : (
            children
          )}
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
