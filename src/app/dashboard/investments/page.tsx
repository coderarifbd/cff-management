'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Edit2, X, Trash2, FileText, Upload } from 'lucide-react';

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Forms
  const [addForm, setAddForm] = useState({ title: '', type: 'Other Investment', amount: 0, date: new Date().toISOString().split('T')[0] });
  const [addFile, setAddFile] = useState<File | null>(null);

  const [manageForm, setManageForm] = useState({ id: '', title: '', type: 'Other Investment', amount: 0, profit: 0, refund: 0, status: 'RUNNING', date: '', documentUrl: '' });
  const [manageFile, setManageFile] = useState<File | null>(null);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/investments');
      const data = await res.json();
      if (Array.isArray(data)) setInvestments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  // Get unique years from investment data
  const availableYears = Array.from(new Set(investments.map(inv => new Date(inv.date).getFullYear()))).sort((a, b) => b - a);
  const months = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'December', value: 11 }
  ];

  // Filtering Logic
  const filteredInvestments = investments.filter(inv => {
    const invDate = new Date(inv.date);
    const matchesSearch = inv.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (inv.type && inv.type.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesMonth = selectedMonth === 'ALL' || invDate.getMonth() === parseInt(selectedMonth);
    const matchesYear = selectedYear === 'ALL' || invDate.getFullYear() === parseInt(selectedYear);
    
    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      let documentUrl = '';
      if (addFile) {
        const formData = new FormData();
        formData.append('file', addFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) documentUrl = uploadData.url;
        else throw new Error('File upload failed');
      }

      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, documentUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowAddModal(false);
      setAddForm({ title: '', type: 'Other Investment', amount: 0, date: new Date().toISOString().split('T')[0] });
      setAddFile(null);
      await fetchInvestments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openManageModal = (inv: any) => {
    setManageForm({
      id: inv.id,
      title: inv.title,
      type: inv.type || 'Other Investment',
      amount: inv.amount,
      profit: inv.profit,
      refund: inv.refund,
      status: inv.status,
      date: new Date(inv.date).toISOString().split('T')[0],
      documentUrl: inv.documentUrl || ''
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
      let documentUrl = manageForm.documentUrl;
      if (manageFile) {
        const formData = new FormData();
        formData.append('file', manageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) documentUrl = uploadData.url;
        else throw new Error('File upload failed');
      }

      const res = await fetch(`/api/investments/${manageForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...manageForm, documentUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowManageModal(false);
      await fetchInvestments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment record completely? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
      if (res.ok) await fetchInvestments();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations based on filtered data
  const totalActiveInvestments = filteredInvestments
    .filter(i => i.status === 'RUNNING')
    .reduce((sum, i) => sum + (i.amount - i.refund), 0);
    
  const totalProfit = filteredInvestments.reduce((sum, i) => sum + i.profit, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Fund Investments</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Investment
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white' }}>
          <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Active Investments (Running)</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>৳ {totalActiveInvestments}</p>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
          <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>Total Profit Earned</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>৳ {totalProfit}</p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search project..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ minWidth: '130px' }}>
          <select 
            className="input" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
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
                <th>Investment Details</th>
                <th>Date Started</th>
                <th>Invested Amount</th>
                <th>Profit Generated</th>
                <th>Refunded</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading investments...</td></tr>
              ) : filteredInvestments.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No investment records found.</td></tr>
              ) : (
                filteredInvestments.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <a href={`/dashboard/investments/${inv.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {inv.title} <ArrowUpRight size={14} />
                      </a>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inv.type || 'Other Investment'}</div>
                    </td>
                    <td>{new Date(inv.date).toLocaleDateString()}</td>
                    <td>৳ {inv.amount}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ ৳ {inv.profit}</td>
                    <td>৳ {inv.refund}</td>
                    <td>
                      <span className={`badge ${inv.status === 'RUNNING' ? 'badge-warning' : inv.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {inv.documentUrl && (
                          <a href={inv.documentUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="View Document">
                            <FileText size={14} />
                          </a>
                        )}
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openManageModal(inv)} title="Manage">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(inv.id)} title="Delete">
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

      {/* Add Investment Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Add New Investment</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Title / Project Name *</label>
                <input type="text" className="input" required value={addForm.title} onChange={e => setAddForm({...addForm, title: e.target.value})} placeholder="e.g. Agricultural Land" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Type</label>
                <select className="input" value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})}>
                  <option value="Land agreement">Land agreement</option>
                  <option value="Bank FDR">Bank FDR</option>
                  <option value="Other Investment">Other Investment</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Amount (৳) *</label>
                  <input type="number" className="input" required min="1" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date *</label>
                  <input type="date" className="input" required value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Paper (PDF/Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="file" id="addFile" style={{ display: 'none' }} accept=".pdf,image/*" onChange={e => setAddFile(e.target.files?.[0] || null)} />
                  <label htmlFor="addFile" className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose File
                  </label>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {addFile ? addFile.name : 'No file selected'}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Add Investment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Investment Modal */}
      {showManageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Manage Investment</h3>
              <button onClick={() => setShowManageModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{manageForm.title}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Invested: ৳ {manageForm.amount} | Date: {manageForm.date}</p>
            </div>

            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <form onSubmit={handleManageSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Update Title</label>
                  <input type="text" className="input" required value={manageForm.title} onChange={e => setManageForm({...manageForm, title: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Type</label>
                  <select className="input" value={manageForm.type} onChange={e => setManageForm({...manageForm, type: e.target.value})}>
                    <option value="Land agreement">Land agreement</option>
                    <option value="Bank FDR">Bank FDR</option>
                    <option value="Other Investment">Other Investment</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Base Amount (৳)</label>
                  <input type="number" className="input" required min="0" value={manageForm.amount} onChange={e => setManageForm({...manageForm, amount: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Profit Earned (৳)</label>
                  <input type="number" className="input" required min="0" value={manageForm.profit} onChange={e => setManageForm({...manageForm, profit: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Principal Refunded (৳)</label>
                  <input type="number" className="input" required min="0" value={manageForm.refund} onChange={e => setManageForm({...manageForm, refund: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
                  <select className="input" value={manageForm.status} onChange={e => setManageForm({...manageForm, status: e.target.value})}>
                    <option value="RUNNING">RUNNING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Update Investment Paper (PDF/Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="file" id="manageFile" style={{ display: 'none' }} accept=".pdf,image/*" onChange={e => setManageFile(e.target.files?.[0] || null)} />
                  <label htmlFor="manageFile" className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={16} /> Choose New File
                  </label>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {manageFile ? manageFile.name : manageForm.documentUrl ? 'Keep existing file' : 'No file uploaded'}
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowManageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>{submitLoading ? 'Saving...' : 'Save Updates'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
