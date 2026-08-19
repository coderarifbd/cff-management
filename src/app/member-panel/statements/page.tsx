'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatDate } from '@/lib/utils';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MemberStatementsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(0);

  useEffect(() => {
    fetch('/api/member/dashboard')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { window.location.href = '/'; });
  }, []);

  if (loading || !data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading statements...</div>;

  const allYears = [...new Set(data.payments.map((p: any) => p.year))].sort((a: any, b: any) => b - a);
  const filtered = filterYear ? data.payments.filter((p: any) => p.year === filterYear) : data.payments;

  const totalPaid = filtered.filter((p: any) => p.isPaid).reduce((s: number, p: any) => s + p.amount + p.fine, 0);
  const totalDue = filtered.filter((p: any) => !p.isPaid).reduce((s: number, p: any) => s + p.amount + p.fine, 0);

  const handleExcel = () => {
    const rows = filtered.map((p: any) => ({
      'Month': monthNames[p.month - 1],
      'Year': p.year,
      'Monthly Fee': p.amount,
      'Late Fine': p.fine,
      'Total': p.amount + p.fine,
      'Status': p.isPaid ? 'PAID' : 'DUE',
      'Date Paid': formatDate(p.paidAt)
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Statements');
    XLSX.writeFile(wb, `CFF_Statement_${data.profile.memberNo}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Payment Statements</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {data.profile.name} · {data.profile.memberNo} · {data.profile.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto' }} value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))}>
            <option value={0}>All Years</option>
            {allYears.map((y: any) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-outline" onClick={handleExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Paid</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>৳ {totalPaid}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Due</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>৳ {totalDue}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Months Paid</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{filtered.filter((p: any) => p.isPaid).length}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Months Due</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{filtered.filter((p: any) => !p.isPaid).length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
              <th>Monthly Fee</th>
              <th>Late Fine</th>
              <th>Total</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Date Paid</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No payments found for this period</td></tr>
            )}
            {filtered.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ fontWeight: 600 }}>{monthNames[p.month - 1]}</td>
                <td>{p.year}</td>
                <td>৳ {p.amount}</td>
                <td style={{ color: p.fine > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {p.fine > 0 ? `৳ ${p.fine}` : '-'}
                </td>
                <td style={{ fontWeight: 600 }}>৳ {p.amount + p.fine}</td>
                <td>
                  <span className={`badge ${p.isPaid ? 'badge-success' : 'badge-danger'}`}>
                    {p.isPaid ? 'PAID' : 'DUE'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {p.isPaid ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', fontSize: '0.875rem' }}>
                      <CheckCircle size={14} />
                      {p.paidAt ? formatDate(p.paidAt) : 'Paid'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', fontSize: '0.875rem' }}>
                      <AlertCircle size={14} /> Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No payments found for this period
            </div>
          ) : (
            filtered.map((p: any) => (
              <div key={p.id} className="card" style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                border: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>
                    {monthNames[p.month - 1]} {p.year}
                  </span>
                  <span className={`badge ${p.isPaid ? 'badge-success' : 'badge-danger'}`}>
                    {p.isPaid ? 'PAID' : 'DUE'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                  <span>Monthly Fee:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>৳ {p.amount.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Late Fine:</span>
                  <span style={{ color: p.fine > 0 ? 'var(--danger)' : 'white' }}>
                    {p.fine > 0 ? `৳ ${p.fine.toLocaleString()}` : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span>Total Amount:</span>
                  <span style={{ color: 'white' }}>৳ {(p.amount + p.fine).toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Date Paid:</span>
                  <span>
                    {p.isPaid ? (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CheckCircle size={14} />
                        {p.paidAt ? formatDate(p.paidAt) : 'Paid'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
