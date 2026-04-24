'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus, Printer, TrendingUp } from 'lucide-react';

export default function InvestmentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [investment, setInvestment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Profit Form
  const [showProfitForm, setShowProfitForm] = useState(false);
  const [profitForm, setProfitForm] = useState({ amount: 0, note: '', date: new Date().toISOString().split('T')[0] });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInvestment = async () => {
    try {
      const res = await fetch(`/api/investments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvestment(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestment();
  }, [id]);

  const handleAddProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/investments/${id}/profit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profitForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowProfitForm(false);
      setProfitForm({ amount: 0, note: '', date: new Date().toISOString().split('T')[0] });
      await fetchInvestment(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <div>Loading investment details...</div>;
  if (!investment) return <div>Investment not found.</div>;

  return (
    <div className="print-container">
      {/* Header Actions (Hidden when printing) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn btn-outline" onClick={() => router.push('/dashboard/investments')}>
          <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} /> Back to Investments
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print / Download PDF
        </button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              {investment.title}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className={`badge ${investment.status === 'RUNNING' ? 'badge-warning' : investment.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                {investment.status}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>• {investment.type || 'Other Investment'}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>• Started: {new Date(investment.date).toLocaleDateString()}</span>
            </div>
          </div>
          {investment.documentUrl && (
            <a href={investment.documentUrl} target="_blank" rel="noreferrer" className="btn btn-outline no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} /> View Document
            </a>
          )}
        </div>

        <div className="grid-2" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Original Invested Amount</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>৳ {investment.amount}</p>
          </div>
          <div style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Profit Earned</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>+ ৳ {investment.profit}</p>
          </div>
          <div style={{ padding: '1.5rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Principal Refunded</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>৳ {investment.refund}</p>
          </div>
          <div style={{ padding: '1.5rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Active Running Amount</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>৳ {investment.amount - investment.refund}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--primary)" /> Profit History
          </h3>
          <button className="btn btn-primary no-print" onClick={() => setShowProfitForm(!showProfitForm)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> Add Profit
          </button>
        </div>

        {showProfitForm && (
          <div className="no-print" style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Record New Profit</h4>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddProfit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date</label>
                <input type="date" className="input" required value={profitForm.date} onChange={e => setProfitForm({...profitForm, date: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Profit Amount (৳)</label>
                <input type="number" className="input" required min="1" value={profitForm.amount} onChange={e => setProfitForm({...profitForm, amount: parseInt(e.target.value) || 0})} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Note / Source</label>
                <input type="text" className="input" placeholder="e.g. Month 1 Return" value={profitForm.note} onChange={e => setProfitForm({...profitForm, note: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ height: '42px' }}>
                {submitLoading ? 'Saving...' : 'Save Profit'}
              </button>
            </form>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Profit Amount</th>
                <th>Note / Source</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {(!investment.profits || investment.profits.length === 0) ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No profit recorded yet.</td></tr>
              ) : (
                investment.profits.map((p: any) => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ ৳ {p.amount}</td>
                    <td>{p.note || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
            break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
