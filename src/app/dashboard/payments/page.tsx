'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, CheckCircle, Plus, Copy, X, Edit2, Filter, Trash2, AlertTriangle, Calendar, Wallet, DollarSign, ArrowRight, User, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function PaymentsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('payments', 'EDIT');
  const canDelete = hasPermission('payments', 'FULL');

  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState<number | ''>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number | ''>(new Date().getFullYear());

  // Form states
  const [addForm, setAddForm] = useState({ userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 500, fine: 0, isPaid: false, notes: '' });
  const [bulkForm, setBulkForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 500 });
  const [editForm, setEditForm] = useState({ id: '', amount: 0, fine: 0, isPaid: false, notes: '', userName: '', memberNo: '', month: 1, year: 2026 });

  // History state
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let url = '/api/payments?';
      if (filterMonth) url += `month=${filterMonth}&`;
      if (filterYear) url += `year=${filterYear}&`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterMonth, filterYear]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members?membersOnly=true');
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data.filter((m: any) => m.status === 'ACTIVE'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (addForm.userId) {
      const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
          const res = await fetch(`/api/payments?userId=${addForm.userId}`);
          const data = await res.json();
          if (Array.isArray(data)) setMemberHistory(data);
        } catch(err) {
          console.error(err);
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchHistory();
    } else {
      setMemberHistory([]);
    }
  }, [addForm.userId]);

  const handleMarkPaid = async (id: string) => {
    try {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, isPaid: true, paidAt: new Date().toISOString() } : p));
      
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true })
      });
      if (res.ok) await fetchPayments(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          paidAt: addForm.isPaid ? new Date().toISOString() : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddModal(false);
      await fetchPayments(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      setShowBulkModal(false);
      await fetchPayments(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (payment: any) => {
    setEditForm({
      id: payment.id,
      amount: payment.amount,
      fine: payment.fine,
      isPaid: payment.isPaid,
      notes: payment.notes || '',
      userName: payment.user?.name || 'Unknown',
      memberNo: payment.user?.memberNo || '',
      month: payment.month,
      year: payment.year
    });
    setError('');
    setShowEditModal(true);
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: editForm.amount,
          fine: editForm.fine,
          isPaid: editForm.isPaid,
          notes: editForm.notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(prev => prev.map(p => p.id === editForm.id ? { ...p, amount: editForm.amount, fine: editForm.fine, isPaid: editForm.isPaid, notes: editForm.notes, paidAt: editForm.isPaid && !p.isPaid ? new Date().toISOString() : p.paidAt } : p));
      setShowEditModal(false);
      await fetchPayments(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPayments(true);
        setDeleteId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const totalCollected = payments.reduce((sum, p) => p.isPaid ? sum + (p.amount + p.fine) : sum, 0);
  const totalDue = payments.reduce((sum, p) => !p.isPaid ? sum + (p.amount + p.fine) : sum, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Collection Registry</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Monitor and manage monthly membership fees and penalties.</p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => { setError(''); setShowBulkModal(true); }}>
              <Copy size={18} /> Bulk Generate
            </button>
            <button className="btn btn-primary" onClick={() => { setError(''); setShowAddModal(true); }}>
              <Plus size={18} /> Add Payment
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label className="reset-label">Select Month</label>
            <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}>
              <option value="">All Months</option>
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div style={{ width: '120px' }}>
            <label className="reset-label">Select Year</label>
            <input type="number" className="input" value={filterYear} onChange={e => setFilterYear(e.target.value ? parseInt(e.target.value) : '')} placeholder="2026" />
          </div>
          <button className="btn btn-primary" onClick={() => fetchPayments()}>
            <Filter size={18} /> Filter
          </button>
        </div>

        <div className="card" style={{ background: 'rgba(245, 158, 11, 0.03)', borderColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Late Fine Policy</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>৳100 auto-applied for payments after the 10th of each month.</p>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '2.5rem' }}>
        <div className="card stat-card" style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><CheckCircle size={24} /></div>
          <div className="stat-info">
            <h3>Collected (Paid)</h3>
            <p>৳ {totalCollected.toLocaleString()}</p>
          </div>
        </div>
        <div className="card stat-card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Total Outstanding</h3>
            <p>৳ {totalDue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member Information</th>
                <th>Billing Period</th>
                <th>Collection Details</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="skeleton" style={{ height: '70px' }}></td></tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No collection records found.</td></tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {payment.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{payment.user?.name || 'Deleted User'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{payment.user?.memberNo || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Calendar size={14} className="text-muted" />
                        {monthNames[payment.month - 1]} {payment.year}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>৳ {(payment.amount + payment.fine).toLocaleString()}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Base: ৳{payment.amount.toLocaleString()} {payment.fine > 0 && <span style={{ color: '#ef4444' }}>+ Fine: ৳{payment.fine.toLocaleString()}</span>}
                        </div>
                        {payment.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Edit2 size={12} /> {payment.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${payment.isPaid ? 'badge-success' : 'badge-danger'}`} style={{ letterSpacing: '0.025em' }}>
                        {payment.isPaid ? 'CONFIRMED' : 'DUE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canEdit && (
                          <button className="btn btn-outline" style={{ width: 32, height: 32, padding: 0 }} onClick={() => openEditModal(payment)} title="Edit Record">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn btn-outline" style={{ width: 32, height: 32, padding: 0, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => setDeleteId(payment.id)} title="Delete Record">
                            <Trash2 size={14} />
                          </button>
                        )}
                        {!payment.isPaid ? (
                          canEdit ? (
                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem' }} onClick={() => handleMarkPaid(payment.id)}>
                              Collect
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0 0.5rem' }}>DUE</span>
                          )
                        ) : (
                          <div style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, padding: '0 0.5rem' }}>
                            <CheckCircle size={14} /> {formatDate(payment.paidAt)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }} onClick={() => setShowEditModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', background: 'var(--background)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Adjust Record</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.2s' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                 {editForm.userName.charAt(0).toUpperCase()}
               </div>
               <div>
                 <p style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>{editForm.userName}</p>
                 <p style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>{monthNames[editForm.month - 1]} {editForm.year} Statement</p>
               </div>
            </div>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            <form onSubmit={handleEditPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="reset-label">Base Fee (৳)</label>
                  <input type="number" className="input" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseInt(e.target.value) || 0})} required />
                </div>
                <div>
                  <label className="reset-label">Penalty (৳)</label>
                  <input type="number" className="input" value={editForm.fine} onChange={e => setEditForm({...editForm, fine: parseInt(e.target.value) || 0})} required />
                </div>
              </div>
              
              <div>
                <label className="reset-label">Remarks / Notes</label>
                <input type="text" className="input" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Optional notes" />
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={editForm.isPaid} onChange={e => setEditForm({...editForm, isPaid: e.target.checked})} style={{ width: 18, height: 18 }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mark as Verified Payment</span>
                </label>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ flex: 1 }}>{submitLoading ? 'Updating...' : 'Apply Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }} onClick={() => setShowAddModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Create Transaction</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={20} /></button>
            </div>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            
            <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label className="reset-label">Associate Member</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <select className="input" style={{ paddingLeft: '2.75rem' }} required value={addForm.userId} onChange={e => setAddForm({...addForm, userId: e.target.value})}>
                    <option value="">-- Search and Select Member --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.memberNo})</option>)}
                  </select>
                </div>

                {addForm.userId && (
                  <div style={{ marginTop: '1.25rem', padding: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Activity size={14} className="text-primary" />
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Payment History</h4>
                    </div>
                    {historyLoading ? (
                      <div className="skeleton" style={{ height: '60px' }}></div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(() => {
                          const prevMonths = [];
                          let m = addForm.month;
                          let y = addForm.year;
                          for (let i = 0; i < 3; i++) {
                            m -= 1;
                            if (m === 0) { m = 12; y -= 1; }
                            prevMonths.push({ month: m, year: y });
                          }
                          
                          return prevMonths.map((pm, idx) => {
                            const record = memberHistory.find(h => h.month === pm.month && h.year === pm.year);
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                  <span style={{ fontWeight: 600 }}>{monthNames[pm.month - 1]} {pm.year}</span>
                                  {record ? (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <span className={`badge ${record.isPaid ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                                        {record.isPaid ? 'PAID' : 'DUE'}
                                      </span>
                                      <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>৳{record.amount + record.fine}</span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No record found</span>
                                  )}
                                </div>
                                {record?.notes && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Edit2 size={10} /> {record.notes}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label className="reset-label">Collection Period</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="input" value={addForm.month} onChange={e => setAddForm({...addForm, month: parseInt(e.target.value)})}>
                      {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" className="input" value={addForm.year} onChange={e => setAddForm({...addForm, year: parseInt(e.target.value)})} style={{ width: '90px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label className="reset-label">Amounts (৳)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="number" className="input" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} placeholder="Fee" />
                    <input type="number" className="input" value={addForm.fine} onChange={e => setAddForm({...addForm, fine: parseInt(e.target.value) || 0})} placeholder="Fine" />
                  </div>
                </div>
              </div>

              <div>
                <label className="reset-label">Remarks / Notes</label>
                <input type="text" className="input" value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} placeholder="Optional notes" />
              </div>

              <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.1)', borderRadius: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addForm.isPaid} onChange={e => setAddForm({...addForm, isPaid: e.target.checked})} style={{ width: 20, height: 20 }} />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>Instant Receipt</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mark as paid and generate transaction timestamp.</p>
                  </div>
                </label>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ minWidth: '150px' }}>
                  {submitLoading ? 'Processing...' : 'Secure Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }} onClick={() => setShowBulkModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 72, height: 72, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--primary-light)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Copy size={36} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Bulk Operations</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              This will batch-generate fee records for all <strong>ACTIVE</strong> members for the specified period.
            </p>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
            
            <form onSubmit={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="reset-label">Target Month</label>
                  <select className="input" value={bulkForm.month} onChange={e => setBulkForm({...bulkForm, month: parseInt(e.target.value)})}>
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="reset-label">Year</label>
                  <input type="number" className="input" value={bulkForm.year} onChange={e => setBulkForm({...bulkForm, year: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="reset-label">Standard Assessment (৳)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input type="number" className="input" style={{ paddingLeft: '2.5rem' }} value={bulkForm.amount} onChange={e => setBulkForm({...bulkForm, amount: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBulkModal(false)} style={{ flex: 1 }}>Discard</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ flex: 1.5 }}>
                  {submitLoading ? 'Generating...' : 'Start Process'} <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1.5rem' }} onClick={() => setDeleteId(null)}>
          <div className="card" style={{ width: '100%', maxWidth: '380px', padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 72, height: 72, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Delete Entry?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
              This record will be permanently purged from the registry. This may impact financial reporting.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteId(null)} disabled={submitLoading}>
                Go Back
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none' }} onClick={() => handleDelete(deleteId)} disabled={submitLoading}>
                {submitLoading ? 'Purging...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
