'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, TrendingUp, Megaphone } from 'lucide-react';

export default function MemberDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/member/dashboard').then(res => res.json()),
      fetch('/api/notices').then(res => res.json())
    ])
    .then(([dashData, noticesData]) => {
      if (dashData.error) throw new Error('Unauthorized');
      setData(dashData);
      setNotices(noticesData || []);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      window.location.href = '/';
    });
  }, []);

  if (loading || !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your secure dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Notices Section */}
      {notices.length > 0 && (
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#92400e' }}>
            <Megaphone size={20} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Latest Notices</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notices.slice(0, 2).map((notice) => (
              <div key={notice.id} style={{ borderBottom: '1px solid #fef3c7', paddingBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>{notice.title}</h4>
                <p style={{ fontSize: '0.85rem', color: '#b45309', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{notice.content}</p>
                <p style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.4rem' }}>{new Date(notice.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card stat-card" style={{ background: 'var(--primary)', color: 'white' }}>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><TrendingUp size={24} /></div>
          <div className="stat-info">
            <h3 style={{ color: 'rgba(255,255,255,0.8)' }}>Total Deposits</h3>
            <p style={{ color: 'white' }}>৳ {data.stats.totalPaidAmount}</p>
          </div>
        </div>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#991b1b' }}><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Total Dues (incl. fines)</h3>
            <p style={{ color: 'var(--danger)' }}>৳ {data.stats.totalDueAmount}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Total Fines Incurred</h3>
            <p>৳ {data.stats.totalPaidFines + data.stats.totalDueFines}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>My Statement & Payment History</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)' }}>Month</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)' }}>Monthly Fee</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)' }}>Fine</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '1rem', borderBottom: '1px solid var(--border)' }}>Date Paid</th>
            </tr>
          </thead>
          <tbody>
            {data.payments.length === 0 && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No payments found</td></tr>}
            {data.payments.map((item: any) => {
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{monthNames[item.month - 1]} {item.year}</td>
                  <td style={{ padding: '1rem' }}>৳ {item.amount}</td>
                  <td style={{ padding: '1rem', color: item.fine > 0 ? 'var(--danger)' : 'inherit' }}>৳ {item.fine}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${item.isPaid ? 'badge-success' : 'badge-danger'}`}>
                      {item.isPaid ? 'PAID' : 'DUE'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {item.isPaid ? (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <CheckCircle size={16} /> {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : 'Paid'}
                      </span>
                    ) : (
                      <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} disabled>
                        Awaiting Payment
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}
