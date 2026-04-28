'use client';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, FileText, LogOut, Lock, Megaphone, Menu, Bell, X, Shield } from 'lucide-react';

export default function MemberPanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/member/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(console.error);
  }, []);

  // Close sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  const navItems = [
    { name: 'My Dashboard', path: '/member-panel', icon: <User size={20} /> },
    { name: 'My Statements', path: '/member-panel/statements', icon: <FileText size={20} /> },
    { name: 'Notices', path: '/member-panel/notices', icon: <Megaphone size={20} /> },
    { name: 'Security', path: '/member-panel/change-password', icon: <Lock size={20} /> },
  ];

  const currentRouteName = navItems.find(item => item.path === pathname)?.name || 'Dashboard';

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
            background: 'linear-gradient(135deg, var(--success), #065f46)', 
            borderRadius: 10, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white', 
            fontWeight: 800,
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>M</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1.2 }}>CFF Member</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Member Panel</span>
          </div>
          <button className="mobile-close" onClick={() => setIsSidebarOpen(false)} style={{ color: 'white', background: 'transparent', border: 'none' }}><X size={24} /></button>
        </div>

        <nav className="sidebar-nav">
          <div style={{ padding: '0 1rem 0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Personal</div>
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
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="user-info-text" style={{ paddingRight: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>{profile?.name || 'Loading...'}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Shield size={10} />
                  {profile?.memberNo || 'Member'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
