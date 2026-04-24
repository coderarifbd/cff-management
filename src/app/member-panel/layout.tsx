'use client';
import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, FileText, LogOut, Lock } from 'lucide-react';

export default function MemberPanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/member/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  const navItems = [
    { name: 'My Dashboard', path: '/member-panel', icon: <User size={20} /> },
    { name: 'My Statements', path: '/member-panel/statements', icon: <FileText size={20} /> },
    { name: 'Security', path: '/member-panel/change-password', icon: <Lock size={20} /> },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ color: 'var(--success)' }}>
          <div style={{ width: 32, height: 32, background: 'var(--success)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>M</div>
          <span>Member Panel</span>
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Member Dashboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile?.name || 'Loading...'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile?.memberNo || ''}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'M'}
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
