'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, CheckCircle, Plus, Copy, X, Edit2, Filter } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState<number | ''>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number | ''>(new Date().getFullYear());

  // Form states
  const [addForm, setAddForm] = useState({ userId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 500, fine: 0, isPaid: false });
  const [bulkForm, setBulkForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: 500 });
  const [editForm, setEditForm] = useState({ id: '', amount: 0, fine: 0, isPaid: false, userName: '', memberNo: '', month: 1, year: 2026 });

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
      // Optimistic update to immediately reflect in UI without waiting for API
      setPayments(prev => prev.map(p => p.id === id ? { ...p, isPaid: true, paidAt: new Date().toISOString() } : p));
      
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true })
      });
      if (res.ok) await fetchPayments(true); // Silent refresh
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
      await fetchPayments(true); // Silent refresh
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
      await fetchPayments(true); // Silent refresh
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
          isPaid: editForm.isPaid
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Optimistically update the UI to avoid lag
      setPayments(prev => prev.map(p => p.id === editForm.id ? { ...p, amount: editForm.amount, fine: editForm.fine, isPaid: editForm.isPaid, paidAt: editForm.isPaid && !p.isPaid ? new Date().toISOString() : p.paidAt } : p));
      
      setShowEditModal(false);
      await fetchPayments(true); // Silent refresh
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Totals
  const totalMonthlyFee = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalLateFine = payments.reduce((sum, p) => sum + p.fine, 0);
  const totalCollected = payments.reduce((sum, p) => p.isPaid ? sum + (p.amount + p.fine) : sum, 0);
  const totalDue = payments.reduce((sum, p) => !p.isPaid ? sum + (p.amount + p.fine) : sum, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Collection & Payments</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={() => { setError(''); setShowBulkModal(true); }}>
            <Copy size={18} style={{ marginRight: '0.5rem' }} /> Bulk Generate
          </button>
          <button className="btn btn-primary" onClick={() => { setError(''); setShowAddModal(true); }}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Payment
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'var(--background)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Filter Month</label>
          <select className="input" value={filterMonth} onChange={e => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')} style={{ width: '150px' }}>
            <option value="">All Months</option>
            {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Filter Year</label>
          <input type="number" className="input" value={filterYear} onChange={e => setFilterYear(e.target.value ? parseInt(e.target.value) : '')} placeholder="e.g. 2026" style={{ width: '120px' }} />
        </div>
        <div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => fetchPayments()}>
            <Filter size={18} style={{ marginRight: '0.5rem' }} /> Apply Filter
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', background: '#fef3c7', border: '1px solid #fde68a' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#92400e' }}>
          <AlertCircle size={24} />
          <div>
            <h4 style={{ fontWeight: 600 }}>System Notice: Auto-Fine Applied</h4>
            <p style={{ fontSize: '0.875rem' }}>Members who have not paid by the 10th of the month have been automatically charged a ৳100 late fine.</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Period</th>
                <th>Monthly Fee</th>
                <th>Late Fine</th>
                <th>Total Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No payments found for the selected period.</td></tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{payment.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{payment.user?.memberNo}</div>
                    </td>
                    <td>{monthNames[payment.month - 1]} {payment.year}</td>
                    <td>৳ {payment.amount}</td>
                    <td style={{ color: payment.fine > 0 ? 'var(--danger)' : 'inherit' }}>৳ {payment.fine}</td>
                    <td style={{ fontWeight: 600 }}>{payment.isPaid ? <span style={{ color: 'var(--text-muted)' }}>৳ 0</span> : `৳ ${payment.amount + payment.fine}`}</td>
                    <td>
                      <span className={`badge ${payment.isPaid ? 'badge-success' : 'badge-danger'}`}>
                        {payment.isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openEditModal(payment)} title="Edit Fee/Fine">
                          <Edit2 size={14} />
                        </button>
                        {!payment.isPaid ? (
                          <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleMarkPaid(payment.id)}>
                            Mark Paid
                          </button>
                        ) : (
                          <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            <CheckCircle size={16} /> {new Date(payment.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f0fdf4', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>TOTAL COLLECTED (PAID):</td>
                  <td style={{ color: 'var(--success)', fontSize: '1.1rem' }}>৳ {totalCollected}</td>
                  <td colSpan={2}></td>
                </tr>
                <tr style={{ background: '#fef2f2', fontWeight: 700 }}>
                  <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-muted)' }}>TOTAL DUE (UNPAID):</td>
                  <td style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>৳ {totalDue}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit Payment Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{editForm.userName} <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 400 }}>({editForm.memberNo})</span></p>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>{monthNames[editForm.month - 1]} {editForm.year}</p>
            </div>

            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleEditPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Monthly Fee Amount (৳)</label>
                <input type="number" className="input" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseInt(e.target.value) || 0})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Late Fine (৳)</label>
                <input type="number" className="input" value={editForm.fine} onChange={e => setEditForm({...editForm, fine: parseInt(e.target.value) || 0})} required />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <input type="checkbox" checked={editForm.isPaid} onChange={e => setEditForm({...editForm, isPaid: e.target.checked})} />
                  <span style={{ fontWeight: 500 }}>Is Paid?</span>
                </label>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add Individual Payment</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Select Member *</label>
                <select className="input" required value={addForm.userId} onChange={e => setAddForm({...addForm, userId: e.target.value})}>
                  <option value="">-- Choose Member --</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.memberNo})</option>)}
                </select>

                {/* History Section */}
                {addForm.userId && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Previous 3 Months History</h4>
                    {historyLoading ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading history...</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(() => {
                          const prevMonths = [];
                          let m = addForm.month;
                          let y = addForm.year;
                          for (let i = 0; i < 3; i++) {
                            m -= 1;
                            if (m === 0) {
                              m = 12;
                              y -= 1;
                            }
                            prevMonths.push({ month: m, year: y });
                          }
                          
                          return prevMonths.map((pm, idx) => {
                            const record = memberHistory.find(h => h.month === pm.month && h.year === pm.year);
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                <span style={{ fontWeight: 500 }}>{monthNames[pm.month - 1]} {pm.year}</span>
                                {record ? (
                                  <span className={`badge ${record.isPaid ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                    {record.isPaid ? 'PAID' : 'UNPAID'} (৳{record.amount + record.fine}) {record.fine > 0 ? `| Fine: ৳${record.fine}` : ''}
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                    NO RECORD
                                  </span>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Month</label>
                  <select className="input" value={addForm.month} onChange={e => setAddForm({...addForm, month: parseInt(e.target.value)})}>
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Year</label>
                  <input type="number" className="input" value={addForm.year} onChange={e => setAddForm({...addForm, year: parseInt(e.target.value)})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Fee Amount (৳)</label>
                  <input type="number" className="input" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Late Fine (৳)</label>
                  <input type="number" className="input" value={addForm.fine} onChange={e => setAddForm({...addForm, fine: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <input type="checkbox" checked={addForm.isPaid} onChange={e => setAddForm({...addForm, isPaid: e.target.checked})} />
                  <span style={{ fontWeight: 500 }}>Mark as Paid immediately</span>
                </label>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Add Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Bulk Generate Fees</h3>
              <button onClick={() => setShowBulkModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This will automatically create UNPAID monthly fee records for all currently <strong>ACTIVE</strong> members.
            </p>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Month</label>
                  <select className="input" value={bulkForm.month} onChange={e => setBulkForm({...bulkForm, month: parseInt(e.target.value)})}>
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Year</label>
                  <input type="number" className="input" value={bulkForm.year} onChange={e => setBulkForm({...bulkForm, year: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Default Monthly Fee (৳)</label>
                <input type="number" className="input" value={bulkForm.amount} onChange={e => setBulkForm({...bulkForm, amount: parseInt(e.target.value) || 0})} />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Generating...' : 'Generate Now'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
