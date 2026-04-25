'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Wallet, AlertTriangle } from 'lucide-react';

export default function IncomesPage() {
  const [incomes, setIncomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ title: '', category: 'Donation', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
  const [addCustomCat, setAddCustomCat] = useState(false);

  const [manageForm, setManageForm] = useState({ id: '', title: '', category: 'Donation', amount: 0, description: '', date: '' });
  const [manageCustomCat, setManageCustomCat] = useState(false);

  const uniqueCategories = Array.from(new Set(['Donation', 'Sponsorship', 'Bank Interest', 'Settlement Reversal', ...incomes.map(e => e.category)]));

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incomes');
      const data = await res.json();
      if (Array.isArray(data)) setIncomes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch('/api/incomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowAddModal(false);
      setAddForm({ title: '', category: 'Donation', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
      await fetchIncomes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openManageModal = (inc: any) => {
    setManageForm({
      id: inc.id,
      title: inc.title || '',
      category: inc.category,
      amount: inc.amount,
      description: inc.description || '',
      date: new Date(inc.date).toISOString().split('T')[0]
    });
    setError('');
    setShowManageModal(true);
  };

  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/incomes/${manageForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manageForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowManageModal(false);
      await fetchIncomes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchIncomes();
        setDeleteId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Other Incomes / Extra Funds</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Income
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading incomes...</td></tr>
              ) : incomes.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>No extra income records found.</td></tr>
              ) : (
                incomes.map((income) => (
                  <tr key={income.id}>
                    <td>{new Date(income.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>{income.title}</td>
                    <td>
                      <span className="badge" style={{ background: '#dcfce3', color: '#166534' }}>
                        {income.category}
                      </span>
                    </td>
                    <td>{income.description || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>+ ৳ {income.amount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openManageModal(income)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setDeleteId(income.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Income Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add New Income</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Income Title *</label>
                <input type="text" className="input" required value={addForm.title} onChange={e => setAddForm({...addForm, title: e.target.value})} placeholder="e.g. Eid Donation 2026" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Category *</label>
                <select className="input" value={addCustomCat ? '__ADD_NEW__' : addForm.category} onChange={e => {
                  if (e.target.value === '__ADD_NEW__') {
                    setAddCustomCat(true);
                    setAddForm({...addForm, category: ''});
                  } else {
                    setAddCustomCat(false);
                    setAddForm({...addForm, category: e.target.value});
                  }
                }}>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add new category</option>
                </select>
                {addCustomCat && (
                  <input type="text" className="input" required style={{ marginTop: '0.5rem' }} placeholder="Type new category..." value={addForm.category} onChange={e => setAddForm({...addForm, category: e.target.value})} />
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} placeholder="Optional details..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Amount (৳) *</label>
                  <input type="number" className="input" required min="1" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date *</label>
                  <input type="date" className="input" required value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Save Income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {showManageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit Income</h3>
              <button onClick={() => setShowManageModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleManageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Income Title *</label>
                <input type="text" className="input" required value={manageForm.title} onChange={e => setManageForm({...manageForm, title: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Category *</label>
                <select className="input" value={manageCustomCat ? '__ADD_NEW__' : manageForm.category} onChange={e => {
                  if (e.target.value === '__ADD_NEW__') {
                    setManageCustomCat(true);
                    setManageForm({...manageForm, category: ''});
                  } else {
                    setManageCustomCat(false);
                    setManageForm({...manageForm, category: e.target.value});
                  }
                }}>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add new category</option>
                </select>
                {manageCustomCat && (
                  <input type="text" className="input" required style={{ marginTop: '0.5rem' }} placeholder="Type new category..." value={manageForm.category} onChange={e => setManageForm({...manageForm, category: e.target.value})} />
                )}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={manageForm.description} onChange={e => setManageForm({...manageForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Amount (৳) *</label>
                  <input type="number" className="input" required min="1" value={manageForm.amount} onChange={e => setManageForm({...manageForm, amount: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date *</label>
                  <input type="date" className="input" required value={manageForm.date} onChange={e => setManageForm({...manageForm, date: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowManageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Save Updates'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: '#fee2e2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>Delete Income?</h3>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Are you sure you want to delete this income record? This action cannot be undone and will decrease the net balance.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }} onClick={() => setDeleteId(null)} disabled={submitLoading}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white', padding: '0.75rem', border: 'none' }} onClick={() => handleDelete(deleteId)} disabled={submitLoading}>
                {submitLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
