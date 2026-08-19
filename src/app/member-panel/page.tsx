'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, TrendingUp, Megaphone, X, Calendar, Wallet, Receipt, Info } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function MemberDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedHidden = localStorage.getItem('cff_read_notices');
    const localHiddenIds = savedHidden ? JSON.parse(savedHidden) : [];

    Promise.all([
      fetch('/api/member/dashboard').then(res => res.json()),
      fetch('/api/notices').then(res => res.json())
    ])
    .then(([dashData, noticesData]) => {
      if (dashData.error) throw new Error('Unauthorized');
      setData(dashData);
      
      // Merge server-side read status with local-side hidden status
      const mergedNotices = (Array.isArray(noticesData) ? noticesData : []).map(n => ({
        ...n,
        isRead: n.isRead || localHiddenIds.includes(n.id)
      }));
      
      setNotices(mergedNotices);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      window.location.href = '/';
    });
  }, []);

  const hideNotice = async (id: string) => {
    try {
      // 1. Optimistic UI update
      setNotices(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      
      // 2. Local fallback persistence
      const savedHidden = localStorage.getItem('cff_read_notices');
      const localHiddenIds = savedHidden ? JSON.parse(savedHidden) : [];
      if (!localHiddenIds.includes(id)) {
        localStorage.setItem('cff_read_notices', JSON.stringify([...localHiddenIds, id]));
      }

      // 3. Server-side persistence
      await fetch('/api/notices/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeId: id })
      });
    } catch (err) {
      console.error('Failed to mark notice as read', err);
    }
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card skeleton" style={{ height: '120px' }}></div>
        ))}
        <div className="card skeleton" style={{ gridColumn: '1 / -1', height: '400px' }}></div>
      </div>
    );
  }

  const visibleNotices = notices.filter(n => !n.isRead).slice(0, 3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>Member Portal</h1>
        <p style={{ color: 'var(--text-muted)' }}>Overview of your account and contributions.</p>
      </div>

      {/* Notices Section */}
      {visibleNotices.length > 0 && (
        <div className="card" style={{ 
          background: 'rgba(245, 158, 11, 0.05)', 
          borderColor: 'rgba(245, 158, 11, 0.2)', 
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '4px', 
            height: '100%', 
            background: '#f59e0b' 
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b' }}>
              <Megaphone size={20} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Active Announcements</h3>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visibleNotices.map((notice) => (
              <div key={notice.id} style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                padding: '1.25rem', 
                borderRadius: '12px', 
                position: 'relative',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button 
                  onClick={() => hideNotice(notice.id)}
                  style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>{notice.title}</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                  <Calendar size={14} />
                  <span>{formatDate(notice.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', border: 'none', color: 'white' }}>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><Wallet size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: 'rgba(255,255,255,0.8)' }}>Total Principal</h3>
            <p style={{ color: 'white' }}>৳ {data.stats.totalPaidFees.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', border: 'none', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}><TrendingUp size={80} /></div>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: 'rgba(255,255,255,0.8)' }}>Net Equity Share</h3>
            <p style={{ color: 'white' }}>৳ {Math.round(data.stats.totalShare).toLocaleString()}</p>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={12} /> {data.stats.profitShare >= 0 ? '+' : ''} ৳ {Math.round(data.stats.profitShare).toLocaleString()} Net Value Added
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Receipt size={24} /></div>
          <div className="stat-info">
            <h3>Outstanding Dues</h3>
            <p style={{ color: '#ef4444' }}>৳ {data.stats.totalDueAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
          <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}><Calendar size={24} /></div>
          <div className="stat-info">
            <h3>Fines & Penalties</h3>
            <p>৳ {(data.stats.totalPaidFines + data.stats.totalDueFines).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Payment Statement</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>History of your monthly fees and contributions</p>
          </div>
        </div>
        
        <div className="table-container desktop-only">
          <table>
            <thead>
              <tr>
                <th>Billing Period</th>
                <th>Monthly Fee</th>
                <th>Fine</th>
                <th>Status</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.length === 0 && <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No payment records found</td></tr>}
              {data.payments.map((item: any) => {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{monthNames[item.month - 1]} {item.year}</td>
                    <td>৳ {item.amount.toLocaleString()}</td>
                    <td style={{ color: item.fine > 0 ? 'var(--danger)' : 'inherit' }}>
                      {item.fine > 0 ? `৳ ${item.fine.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${item.isPaid ? 'badge-success' : 'badge-danger'}`}>
                        {item.isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </td>
                    <td>
                      {item.isPaid ? (
                        <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                          <CheckCircle size={16} /> 
                          <span>{item.paidAt ? formatDate(item.paidAt) : 'Confirmed'}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={16} /> 
                          Awaiting Payment
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mobile-only" style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No payment records found
              </div>
            ) : (
              data.payments.map((item: any) => {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return (
                  <div key={item.id} className="card" style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
                        {monthNames[item.month - 1]} {item.year}
                      </span>
                      <span className={`badge ${item.isPaid ? 'badge-success' : 'badge-danger'}`}>
                        {item.isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span>Monthly Fee:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>৳ {item.amount.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>Fine:</span>
                      <span style={{ color: item.fine > 0 ? 'var(--danger)' : 'white' }}>
                        {item.fine > 0 ? `৳ ${item.fine.toLocaleString()}` : '—'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>Payment Date:</span>
                      <span>
                        {item.isPaid ? (
                          <span style={{ color: '#34d399', fontWeight: 600 }}>
                            {item.paidAt ? formatDate(item.paidAt) : 'Confirmed'}
                          </span>
                        ) : (
                          <span>Awaiting Payment</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
