'use client';
import { useState, useEffect } from 'react';
import { Plus, Receipt, Edit2, Trash2, X, Upload, FileText, AlertTriangle } from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ category: 'Events', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addCustomCat, setAddCustomCat] = useState(false);

  const [manageForm, setManageForm] = useState({ id: '', category: 'Events', amount: 0, description: '', date: '', receiptUrl: '' });
  const [manageFile, setManageFile] = useState<File | null>(null);
  const [manageCustomCat, setManageCustomCat] = useState(false);

  const uniqueCategories = Array.from(new Set(['Events', 'Bills', 'Maintenance', ...expenses.map(e => e.category)]));

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Filter Helpers
  const availableYears = Array.from(new Set(expenses.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a);
  const months = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'December', value: 11 }
  ];

  // Filtering Logic
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const matchesSearch = exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    const matchesMonth = selectedMonth === 'ALL' || expDate.getMonth() === parseInt(selectedMonth);
    const matchesYear = selectedYear === 'ALL' || expDate.getFullYear() === parseInt(selectedYear);
    
    return matchesSearch && matchesCategory && matchesMonth && matchesYear;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      let receiptUrl = '';
      if (addFile) {
        const formData = new FormData();
        formData.append('file', addFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) receiptUrl = uploadData.url;
        else throw new Error('File upload failed');
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, receiptUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowAddModal(false);
      setAddForm({ category: 'Events', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
      setAddFile(null);
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openManageModal = (exp: any) => {
    setManageForm({
      id: exp.id,
      category: exp.category,
      amount: exp.amount,
      description: exp.description || '',
      date: new Date(exp.date).toISOString().split('T')[0],
      receiptUrl: exp.receiptUrl || ''
    });
    setManageFile(null);
    setError('');
    setShowManageModal(true);
  };

  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      let receiptUrl = manageForm.receiptUrl;
      if (manageFile) {
        const formData = new FormData();
        formData.append('file', manageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) receiptUrl = uploadData.url;
        else throw new Error('File upload failed');
      }

      const res = await fetch(`/api/expenses/${manageForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manageForm, receiptUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowManageModal(false);
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchExpenses();
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Expenses Overview</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add Expense
        </button>
      </div>

      {/* Search & Filter Section */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search expenses..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '130px' }}>
          <select 
            className="input" 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: '130px' }}>
          <select 
            className="input" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="ALL">All Months</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: '130px' }}>
          <select 
            className="input" 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="ALL">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>Loading expenses...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center' }}>No expense records found.</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                    <td>
                      <span className="badge" style={{ background: '#e2e8f0', color: '#475569' }}>
                        {expense.category}
                      </span>
                    </td>
                    <td>{expense.description || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--danger)' }}>- ৳ {expense.amount}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {expense.receiptUrl && (
                          <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="View Receipt">
                            <Receipt size={14} />
                          </a>
                        )}
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openManageModal(expense)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => setDeleteId(expense.id)} title="Delete">
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

      {/* Add Expense Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Record New Expense</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Expense Details / Description</label>
                <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={addForm.description} onChange={e => setAddForm({...addForm, description: e.target.value})} placeholder="e.g. Annual Picnic 2026 supplies" />
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Attach Receipt (PDF/Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="file" id="addFile" style={{ display: 'none' }} accept=".pdf,image/*" onChange={e => setAddFile(e.target.files?.[0] || null)} />
                  <label htmlFor="addFile" className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Upload Receipt
                  </label>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {addFile ? addFile.name : 'No file selected'}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Save Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showManageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Edit Expense</h3>
              <button onClick={() => setShowManageModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleManageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Expense Details / Description</label>
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
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Update Receipt</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="file" id="manageFile" style={{ display: 'none' }} accept=".pdf,image/*" onChange={e => setManageFile(e.target.files?.[0] || null)} />
                  <label htmlFor="manageFile" className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose New File
                  </label>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {manageFile ? manageFile.name : manageForm.receiptUrl ? 'Keep existing file' : 'No file uploaded'}
                  </span>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>Delete Expense?</h3>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Are you sure you want to delete this expense record? This action cannot be undone and will permanently remove it from the system.
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
