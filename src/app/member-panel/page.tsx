'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function MemberDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/member/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        window.location.href = '/';
      });
  }, []);

  if (loading || !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading your secure dashboard...</div>;

  return (
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
  );
}
