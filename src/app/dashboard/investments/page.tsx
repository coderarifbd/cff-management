'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Edit2, X, Trash2, FileText, Upload, DollarSign, Bell, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { uploadFileAction } from '@/app/actions/uploadAction';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function InvestmentsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('investments', 'EDIT');
  const canDelete = hasPermission('investments', 'FULL');

  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({ title: '', type: 'Other Investment', amount: 0, date: new Date().toISOString().split('T')[0], profitPeriod: 'NONE' });
  const [addFile, setAddFile] = useState<File | null>(null);

  const [manageForm, setManageForm] = useState({ id: '', title: '', type: 'Other Investment', amount: 0, profit: 0, refund: 0, status: 'RUNNING', date: '', documentUrl: '', profitPeriod: 'NONE', closeDate: '' });
  const [manageFile, setManageFile] = useState<File | null>(null);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // Sorting Logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to desc for amounts and dates, asc for text and status
      if (['amount', 'profit', 'refund', 'date'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle null/undefined values
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';

    if (sortField === 'month') {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      const aMonth = aDate.getMonth();
      const bMonth = bDate.getMonth();
      if (aMonth !== bMonth) {
        return sortDirection === 'asc' ? aMonth - bMonth : bMonth - aMonth;
      }
      // Sub-sort chronologically if months are the same
      return aDate.getTime() - bDate.getTime();
    }

    if (sortField === 'date') {
      const aTime = new Date(aVal).getTime() || 0;
      const bTime = new Date(bVal).getTime() || 0;
      return sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
        : bVal.localeCompare(aVal, undefined, { sensitivity: 'base' });
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
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
        
        // Use Server Action instead of Route Handler to bypass size limits
        const uploadData = await uploadFileAction(formData);
        
        if (uploadData.success) {
          documentUrl = uploadData.url || '';
        } else {
          throw new Error(uploadData.error || 'File upload failed');
        }
      }

      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, documentUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setShowAddModal(false);
      setAddForm({ title: '', type: 'Other Investment', amount: 0, date: new Date().toISOString().split('T')[0], profitPeriod: 'NONE' });
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
      documentUrl: inv.documentUrl || '',
      profitPeriod: inv.profitPeriod || 'NONE',
      closeDate: inv.closeDate ? new Date(inv.closeDate).toISOString().split('T')[0] : ''
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
        
        // Use Server Action instead of Route Handler to bypass size limits
        const uploadData = await uploadFileAction(formData);
        
        if (uploadData.success) {
          documentUrl = uploadData.url || '';
        } else {
          throw new Error(uploadData.error || 'File upload failed');
        }
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

  // Helper to determine if a profit is due/overdue
  const isProfitOverdue = (inv: any): { overdue: boolean; nextDueDate?: string } => {
    if (inv.status !== 'RUNNING') return { overdue: false };
    if (!inv.profitPeriod || inv.profitPeriod === 'NONE') return { overdue: false };

    const startDate = new Date(inv.date);
    const currentDate = new Date();
    
    // Find the date of the last profit, or default to the investment start date
    let referenceDate = startDate;
    if (inv.profits && inv.profits.length > 0) {
      const profitDates = inv.profits.map((p: any) => new Date(p.date).getTime());
      const maxTime = Math.max(...profitDates);
      referenceDate = new Date(maxTime);
    }

    // Calculate next due date from referenceDate
    const getNextDate = (ref: Date, period: string): Date => {
      const d = new Date(ref);
      let monthsToAdd = 0;
      if (period === 'YEARLY') {
        monthsToAdd = 12;
      } else if (period === 'EVERY_6_MONTHS') {
        monthsToAdd = 6;
      } else if (period === 'EVERY_3_MONTHS') {
        monthsToAdd = 3;
      } else {
        // Default to MONTHLY (1 month)
        monthsToAdd = 1;
      }
      
      const targetMonth = ref.getMonth() + monthsToAdd;
      d.setMonth(targetMonth);
      if (d.getMonth() !== (targetMonth % 12 + 12) % 12) {
        d.setDate(0);
      }
      return d;
    };

    const nextDueDate = getNextDate(referenceDate, inv.profitPeriod);

    if (nextDueDate <= currentDate) {
      return {
        overdue: true,
        nextDueDate: formatDate(nextDueDate)
      };
    }

    return { overdue: false };
  };

  // Calculations based on filtered data
  const totalInvested = filteredInvestments.reduce((sum, i) => sum + i.amount, 0);
  const totalProfit = filteredInvestments.reduce((sum, i) => sum + i.profit, 0);
  const totalRefunded = filteredInvestments.reduce((sum, i) => sum + i.refund, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Fund Investments</h2>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> New Investment
          </button>
        )}
      </div>

      {/* Stats Section */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="card stat-card" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Invested</h3>
            <p>৳ {totalInvested.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Profit</h3>
            <p>৳ {totalProfit.toLocaleString()}</p>
          </div>
        </div>

        <div className="card stat-card" style={{ background: 'rgba(79, 70, 229, 0.05)', borderColor: 'rgba(79, 70, 229, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <ArrowDownRight size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Returned</h3>
            <p>৳ {totalRefunded.toLocaleString()}</p>
          </div>
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
        <div style={{ minWidth: '170px' }}>
          <select 
            className="input" 
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field);
              setSortDirection(direction as 'asc' | 'desc');
            }}
          >
            <option value="date-desc">Sort: Date (Newest)</option>
            <option value="date-asc">Sort: Date (Oldest)</option>
            <option value="month-asc">Sort: Month (Jan to Dec)</option>
            <option value="month-desc">Sort: Month (Dec to Jan)</option>
            <option value="amount-desc">Sort: Amount (High to Low)</option>
            <option value="amount-asc">Sort: Amount (Low to High)</option>
            <option value="profit-desc">Sort: Profit (High to Low)</option>
            <option value="profit-asc">Sort: Profit (Low to High)</option>
            <option value="title-asc">Sort: Title (A to Z)</option>
            <option value="title-desc">Sort: Title (Z to A)</option>
            <option value="status-asc">Sort: Status (A to Z)</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th className={`sortable ${sortField === 'title' ? 'active' : ''}`} onClick={() => handleSort('title')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Investment Details
                    <span className="sort-icon">
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th className={`sortable ${sortField === 'date' ? 'active' : ''}`} onClick={() => handleSort('date')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Date Started
                    <span className="sort-icon">
                      {sortField === 'date' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th className={`sortable ${sortField === 'amount' ? 'active' : ''}`} onClick={() => handleSort('amount')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Invested Amount
                    <span className="sort-icon">
                      {sortField === 'amount' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th className={`sortable ${sortField === 'profit' ? 'active' : ''}`} onClick={() => handleSort('profit')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Profit Generated
                    <span className="sort-icon">
                      {sortField === 'profit' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th className={`sortable ${sortField === 'refund' ? 'active' : ''}`} onClick={() => handleSort('refund')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Refunded
                    <span className="sort-icon">
                      {sortField === 'refund' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th className={`sortable ${sortField === 'status' ? 'active' : ''}`} onClick={() => handleSort('status')}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Status
                    <span className="sort-icon">
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                      )}
                    </span>
                  </div>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Loading investments...</td></tr>
              ) : sortedInvestments.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>No investment records found.</td></tr>
              ) : (
                sortedInvestments.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <a href={`/dashboard/investments/${inv.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {inv.title} <ArrowUpRight size={14} />
                      </a>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inv.type || 'Other Investment'}</div>
                    </td>
                    <td>{formatDate(inv.date)}</td>
                    <td>৳ {inv.amount.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ ৳ {inv.profit.toLocaleString()}</td>
                    <td>৳ {inv.refund.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.status === 'RUNNING' ? 'badge-warning' : inv.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'}`}>
                        {inv.status}
                      </span>
                      {inv.closeDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Closed: {formatDate(inv.closeDate)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {(() => {
                          const showBell = inv.status === 'RUNNING';
                          if (!showBell) return null;
                          const check = isProfitOverdue(inv);
                          return (
                            <div className="tooltip-wrapper" style={{ marginRight: '0.25rem' }}>
                              <span className={check.overdue ? "bell-icon-overdue" : "bell-icon-normal"}>
                                <Bell size={14} />
                                {check.overdue && <span className="bell-red-dot" />}
                              </span>
                              <span className="tooltip-text">
                                {check.overdue 
                                  ? `Profit due since ${check.nextDueDate}! Go to details to add profit.`
                                  : check.nextDueDate 
                                    ? `Next profit due on ${check.nextDueDate}`
                                    : 'No due'}
                              </span>
                            </div>
                          );
                        })()}
                        {inv.documentUrl && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                            onClick={() => setPreviewUrl(inv.documentUrl)}
                            title="View Document"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => openManageModal(inv)} title="Manage">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(inv.id)} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sortedInvestments.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)', fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-muted)' }}>Filtered Totals:</td>
                  <td style={{ padding: '1rem', color: 'var(--text-main)' }}>৳ {sortedInvestments.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</td>
                  <td style={{ color: 'var(--success)', padding: '1rem' }}>+ ৳ {sortedInvestments.reduce((sum, i) => sum + i.profit, 0).toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-main)' }}>৳ {sortedInvestments.reduce((sum, i) => sum + i.refund, 0).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Investment Type</label>
                  <select className="input" value={addForm.type} onChange={e => setAddForm({...addForm, type: e.target.value})}>
                    <option value="Land agreement">Land agreement</option>
                    <option value="Bank FDR">Bank FDR</option>
                    <option value="Other Investment">Other Investment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Profit Period / Cycle</label>
                  <select className="input" value={addForm.profitPeriod} onChange={e => setAddForm({...addForm, profitPeriod: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="MONTHLY">Monthly (1 Month)</option>
                    <option value="EVERY_3_MONTHS">3 Months Cycle</option>
                    <option value="EVERY_6_MONTHS">6 Months Cycle</option>
                    <option value="YEARLY">Yearly (12 Months)</option>
                  </select>
                </div>
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
                  <input type="file" id="addFile" style={{ display: 'none' }} accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={e => setAddFile(e.target.files?.[0] || null)} />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Principal Refunded</label>
                  <input type="number" className="input" required min="0" value={manageForm.refund} onChange={e => setManageForm({...manageForm, refund: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
                  <select 
                    className="input" 
                    value={manageForm.status} 
                    onChange={e => {
                      const newStatus = e.target.value;
                      let updatedCloseDate = manageForm.closeDate;
                      if ((newStatus === 'COMPLETED' || newStatus === 'FAILED') && !manageForm.closeDate) {
                        updatedCloseDate = new Date().toISOString().split('T')[0];
                      } else if (newStatus === 'RUNNING') {
                        updatedCloseDate = '';
                      }
                      setManageForm({
                        ...manageForm,
                        status: newStatus,
                        closeDate: updatedCloseDate
                      });
                    }}
                  >
                    <option value="RUNNING">RUNNING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Profit Period</label>
                  <select className="input" value={manageForm.profitPeriod} onChange={e => setManageForm({...manageForm, profitPeriod: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="MONTHLY">Monthly (1 Month)</option>
                    <option value="EVERY_3_MONTHS">3 Months Cycle</option>
                    <option value="EVERY_6_MONTHS">6 Months Cycle</option>
                    <option value="YEARLY">Yearly (12 Months)</option>
                  </select>
                </div>
              </div>
              {(manageForm.status === 'COMPLETED' || manageForm.status === 'FAILED') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Close Date *</label>
                  <input 
                    type="date" 
                    className="input" 
                    required 
                    value={manageForm.closeDate} 
                    onChange={e => setManageForm({...manageForm, closeDate: e.target.value})} 
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Update Investment Paper (PDF/Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="file" id="manageFile" style={{ display: 'none' }} accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={e => setManageFile(e.target.files?.[0] || null)} />
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
      {/* Document Preview Modal */}
      {previewUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', zIndex: 1000, padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', color: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Document Preview</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href={previewUrl} download className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>Download File</a>
              <button onClick={() => setPreviewUrl(null)} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}>Close Preview</button>
            </div>
          </div>
          
          <div style={{ flex: 1, background: 'white', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={previewUrl} alt="Document" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : previewUrl.toLowerCase().endsWith('.pdf') ? (
              <embed src={previewUrl} type="application/pdf" style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <FileText size={64} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#1e293b', fontSize: '1.125rem', fontWeight: 600 }}>Preview not available for this file type.</p>
                <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Please download the file to view it on your device.</p>
                <a href={previewUrl} download className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Download Now</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
