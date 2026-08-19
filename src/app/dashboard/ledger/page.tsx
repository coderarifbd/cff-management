'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Download, Printer, Search, Table, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/auth-context';

export default function LedgerPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('ledger', 'EDIT');
  const canDelete = hasPermission('ledger', 'FULL');

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Forms
  const [formType, setFormType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0
  });

  const [editForm, setEditForm] = useState({
    id: '',
    date: '',
    description: '',
    amount: 0,
    type: 'INCOME' as 'INCOME' | 'EXPENSE'
  });

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // 1. Sort entries chronologically to compute standard Running Balance
  const sortedAllEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // 2. Map through sorted entries to compute Running Balance sequentially
  let runningTotal = 0;
  const entriesWithRunningBalance = sortedAllEntries.map(entry => {
    runningTotal += (entry.income - entry.expense);
    return {
      ...entry,
      runningBalance: runningTotal
    };
  });

  // 3. Apply Search and Filters on the computed records
  const filteredEntries = entriesWithRunningBalance.filter(entry => {
    const entryDate = new Date(entry.date);
    const matchesSearch = entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = selectedMonth === 'ALL' || entryDate.getMonth() === parseInt(selectedMonth);
    const matchesYear = selectedYear === 'ALL' || entryDate.getFullYear() === parseInt(selectedYear);
    return matchesSearch && matchesMonth && matchesYear;
  });

  // Reverse back to descending view for the table so new entries appear on top (standard user dashboard experience)
  // or keep it ascending like a real spreadsheet? Real spreadsheets are ascending (oldest at top).
  // Let's provide a toggle or keep it chronologically ascending (oldest at top) to exactly match Google Sheets/Excel!
  // In the screenshot, the dates go 5/1/2026 -> 7/1/2026 -> 23/01/2026 ... up to 24-06-2026. This is CHRONOLOGICALLY ASCENDING.
  // So we will display it ascending, exactly like the spreadsheet screenshot! This is perfect.
  const displayEntries = filteredEntries;

  // Years for filter dropdown
  const availableYears = Array.from(new Set(entries.map(e => new Date(e.date).getFullYear()))).sort((a, b) => b - a);
  const months = [
    { name: 'January (জানুয়ারি)', value: 0 }, { name: 'February (ফেব্রুয়ারি)', value: 1 }, { name: 'March (মার্চ)', value: 2 },
    { name: 'April (এপ্রিল)', value: 3 }, { name: 'May (মে)', value: 4 }, { name: 'June (জুন)', value: 5 },
    { name: 'July (জুলাই)', value: 6 }, { name: 'August (আগস্ট)', value: 7 }, { name: 'September (সেপ্টেম্বর)', value: 8 },
    { name: 'October (অক্টোবর)', value: 9 }, { name: 'November (নভেম্বর)', value: 10 }, { name: 'December (ডিসেম্বর)', value: 11 }
  ];

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    const payload = {
      date: addForm.date,
      description: addForm.description,
      income: formType === 'INCOME' ? addForm.amount : 0,
      expense: formType === 'EXPENSE' ? addForm.amount : 0
    };

    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save entry');
      
      setShowAddModal(false);
      setAddForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0
      });
      await fetchEntries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEditModal = (entry: any) => {
    const isIncome = entry.income > 0;
    setEditForm({
      id: entry.id,
      date: new Date(entry.date).toISOString().split('T')[0],
      description: entry.description,
      amount: isIncome ? entry.income : entry.expense,
      type: isIncome ? 'INCOME' : 'EXPENSE'
    });
    setError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');

    const payload = {
      date: editForm.date,
      description: editForm.description,
      income: editForm.type === 'INCOME' ? editForm.amount : 0,
      expense: editForm.type === 'EXPENSE' ? editForm.amount : 0
    };

    try {
      const res = await fetch(`/api/ledger/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update entry');
      
      setShowEditModal(false);
      await fetchEntries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/ledger/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchEntries();
        setDeleteId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete entry');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleExcelExport = () => {
    const rows = filteredEntries.map((e, index) => ({
      'ক্রমিক নং': index + 1,
      'তারিখ (Date)': new Date(e.date).toLocaleDateString('en-GB'),
      'বিবরণ (Description)': e.description,
      'আয় (Income)': e.income || '',
      'ব্যয় (Expense)': e.expense || '',
      'মূলধন/জের (Balance)': e.runningBalance
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set widths
    const wscols = [
      { wch: 10 }, // Index
      { wch: 15 }, // Date
      { wch: 40 }, // Description
      { wch: 15 }, // Income
      { wch: 15 }, // Expense
      { wch: 18 }  // Balance
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Cash Book');
    XLSX.writeFile(wb, `CFF_Ledger_CashBook_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date helper for spreadsheet style (DD/MM/YYYY)
  const formatSpreadsheetDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtered Totals
  const totalIncome = filteredEntries.reduce((sum, e) => sum + e.income, 0);
  const totalExpense = filteredEntries.reduce((sum, e) => sum + e.expense, 0);
  const filteredNet = totalIncome - totalExpense;

  return (
    <div>
      {/* Dynamic styles for spreadsheet view and printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, header, aside, .topbar, button, .actions-col {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
          }
          .page-content {
            padding: 0 !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 2rem;
          }
          .spreadsheet-container {
            border: 1px solid #000 !important;
            background: white !important;
          }
          .spreadsheet-table th, .spreadsheet-table td {
            border: 1px solid #000 !important;
            color: black !important;
            background: white !important;
          }
        }
        
        .spreadsheet-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          margin-bottom: 1.5rem;
        }

        .spreadsheet-table {
          width: 100%;
          border-collapse: collapse;
        }

        .spreadsheet-table th {
          background: rgba(15, 23, 42, 0.85);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid var(--border);
          padding: 0.875rem 1rem;
          text-align: left;
        }

        .spreadsheet-table td {
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
        }

        .spreadsheet-table tr:hover td {
          background: rgba(255, 255, 255, 0.04);
        }

        .font-mono-ledger {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
      `}} />

      {/* Print-only Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>চাকালমুয়া ফ্রেন্ডস ফেডারেশন (CFF)</h1>
        <p style={{ fontSize: '1rem', color: '#555', marginTop: '0.25rem' }}>জেনারেল লেজার হিসাব খাতা (General Ledger Cash Book)</p>
        <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
          রিপোর্ট সময়কাল: {selectedMonth !== 'ALL' ? months.find(m => m.value === parseInt(selectedMonth))?.name : 'সকল মাস'} / {selectedYear !== 'ALL' ? selectedYear : 'সকল বছর'}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#999' }}>প্রিন্ট তারিখ: {formatSpreadsheetDate(new Date().toISOString())}</p>
        <hr style={{ margin: '1.5rem 0', borderColor: '#000' }} />
      </div>

      {/* Main Header Row */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Table size={28} style={{ color: 'var(--primary-light)' }} /> Ledger (হিসাব খাতা)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Federation Income, Expense & Running Balance Cash Book Registry.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleExcelExport}>
            <Download size={18} /> Export Excel
          </button>
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={18} /> Print Cash Book
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input" 
            style={{ paddingLeft: '2.75rem' }}
            placeholder="Search description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ width: '180px' }}>
          <select 
            className="input" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="ALL">All Months (সকল মাস)</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>
        <div style={{ width: '140px' }}>
          <select 
            className="input" 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="ALL">All Years (সকল বছর)</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-light)', background: 'rgba(34, 197, 94, 0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>Total Filtered Income (মোট আয়)</div>
          <div className="font-mono-ledger" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-light)' }}>৳ {totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>Total Filtered Expense (মোট ব্যয়)</div>
          <div className="font-mono-ledger" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>৳ {totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>Net Period Flow (জের/মূলধন প্রবাহ)</div>
          <div className="font-mono-ledger" style={{ fontSize: '1.4rem', fontWeight: 800, color: filteredNet >= 0 ? 'var(--primary-light)' : 'var(--danger)' }}>
            {filteredNet >= 0 ? '+' : ''} ৳ {filteredNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.375rem', fontWeight: 600 }}>Closing Balance (বর্তমান জের)</div>
          <div className="font-mono-ledger" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
            ৳ {runningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="spreadsheet-container desktop-only">
        <table className="spreadsheet-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>No</th>
              <th style={{ width: '130px' }}>তারিখ (Date)</th>
              <th>বিবরণ (Description)</th>
              <th style={{ width: '150px', textAlign: 'right' }}>আয় (Income)</th>
              <th style={{ width: '150px', textAlign: 'right' }}>ব্যয় (Expense)</th>
              <th style={{ width: '180px', textAlign: 'right' }}>মূলধন/জের (Balance)</th>
              <th className="actions-col no-print" style={{ width: '110px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading Cash Book Registry...
                </td>
              </tr>
            ) : displayEntries.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No ledger transactions found matching search/filter.
                </td>
              </tr>
            ) : (
              displayEntries.map((e, index) => (
                <tr key={e.id}>
                  <td className="font-mono-ledger" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    {index + 1}
                  </td>
                  <td className="font-mono-ledger">
                    {formatSpreadsheetDate(e.date)}
                  </td>
                  <td style={{ fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {e.description}
                  </td>
                  <td className="font-mono-ledger" style={{ textAlign: 'right', color: e.income > 0 ? 'var(--primary-light)' : 'rgba(255,255,255,0.1)' }}>
                    {e.income > 0 ? `৳ ${e.income.toFixed(2)}` : '—'}
                  </td>
                  <td className="font-mono-ledger" style={{ textAlign: 'right', color: e.expense > 0 ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}>
                    {e.expense > 0 ? `৳ ${e.expense.toFixed(2)}` : '—'}
                  </td>
                  <td className="font-mono-ledger" style={{ textAlign: 'right', fontWeight: 700, background: 'rgba(255,255,255,0.01)', color: e.runningBalance >= 0 ? 'var(--text-main)' : 'var(--danger)' }}>
                    ৳ {e.runningBalance.toFixed(2)}
                  </td>
                  <td className="actions-col no-print" style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {e.source === 'income' || e.source === 'expense' ? 'Manual' : 'Auto-synced'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {displayEntries.length > 0 && (
            <tfoot>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)', fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: 'right', padding: '1rem' }}>TOTAL (মোট ফিল্টারকৃত):</td>
                <td className="font-mono-ledger" style={{ textAlign: 'right', color: 'var(--primary-light)', padding: '1rem' }}>
                  ৳ {totalIncome.toFixed(2)}
                </td>
                <td className="font-mono-ledger" style={{ textAlign: 'right', color: 'var(--danger)', padding: '1rem' }}>
                  ৳ {totalExpense.toFixed(2)}
                </td>
                <td className="font-mono-ledger" style={{ textAlign: 'right', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)' }}>
                  ৳ {runningTotal.toFixed(2)}
                </td>
                <td className="actions-col no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mobile-only no-print" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: '180px', borderRadius: '16px' }}></div>
            ))
          ) : displayEntries.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No ledger transactions found matching search/filter.
            </div>
          ) : (
            <>
              {displayEntries.map((e, index) => (
                <div key={e.id} className="card" style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg, rgba(30, 41, 59, 0.5))'
                }}>
                  {/* Header: No, Date & Source */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="font-mono-ledger" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        #{index + 1}
                      </span>
                      <span className="font-mono-ledger" style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>
                        {formatSpreadsheetDate(e.date)}
                      </span>
                    </div>
                    <div>
                      {!(e.source === 'income' || e.source === 'expense') ? (
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                          Auto-synced
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                          Manual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Description */}
                  <div style={{ 
                    padding: '0.75rem 0', 
                    borderTop: '1px solid var(--border)', 
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    color: 'white',
                    lineHeight: 1.4,
                    fontWeight: 500
                  }}>
                    {e.description}
                  </div>

                  {/* Flow grid: Income, Expense, Balance */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Income</div>
                      <div className="font-mono-ledger" style={{ color: e.income > 0 ? 'var(--primary-light)' : 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                        {e.income > 0 ? `৳ ${e.income.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Expense</div>
                      <div className="font-mono-ledger" style={{ color: e.expense > 0 ? 'var(--danger)' : 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
                        {e.expense > 0 ? `৳ ${e.expense.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Balance</div>
                      <div className="font-mono-ledger" style={{ color: e.runningBalance >= 0 ? 'white' : 'var(--danger)', fontWeight: 700 }}>
                        ৳ {e.runningBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                </div>
              ))}

              {/* Total Card */}
              <div className="card" style={{
                padding: '1.25rem',
                border: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                <div style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Filtered Ledger Totals</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Income:</span>
                  <span style={{ color: 'var(--primary-light)' }}>৳ {totalIncome.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Expense:</span>
                  <span style={{ color: 'var(--danger)' }}>৳ {totalExpense.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Closing Balance:</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>৳ {runningTotal.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem'
        }} onClick={() => setShowAddModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', background: 'var(--background)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>লেনদেন যোগ করুন</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Add a new cash book record to the general ledger.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="reset-label">লেনদেন প্রকার (Transaction Type)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setFormType('INCOME')}
                    style={{
                      background: formType === 'INCOME' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: formType === 'INCOME' ? 'var(--primary-light)' : 'var(--border)',
                      color: formType === 'INCOME' ? 'var(--primary-light)' : 'var(--text-muted)'
                    }}
                  >
                    আয় (Income)
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setFormType('EXPENSE')}
                    style={{
                      background: formType === 'EXPENSE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: formType === 'EXPENSE' ? 'var(--danger)' : 'var(--border)',
                      color: formType === 'EXPENSE' ? 'var(--danger)' : 'var(--text-muted)'
                    }}
                  >
                    ব্যয় (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="reset-label">তারিখ (Date)</label>
                <input 
                  type="date" 
                  className="input" 
                  value={addForm.date} 
                  onChange={e => setAddForm({...addForm, date: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="reset-label">বিবরণ (Description)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. কাইয়ুম চাচা জমি পত্তন"
                  value={addForm.description} 
                  onChange={e => setAddForm({...addForm, description: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="reset-label">পরিমাণ (Amount ৳)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="input" 
                  placeholder="0.00"
                  value={addForm.amount || ''} 
                  onChange={e => setAddForm({...addForm, amount: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ minWidth: '120px' }}>
                  {submitLoading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem'
        }} onClick={() => setShowEditModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', background: 'var(--background)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>সম্পাদনা করুন</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Modify general ledger transaction details.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="reset-label">লেনদেন প্রকার (Transaction Type)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditForm({...editForm, type: 'INCOME'})}
                    style={{
                      background: editForm.type === 'INCOME' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: editForm.type === 'INCOME' ? 'var(--primary-light)' : 'var(--border)',
                      color: editForm.type === 'INCOME' ? 'var(--primary-light)' : 'var(--text-muted)'
                    }}
                  >
                    আয় (Income)
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEditForm({...editForm, type: 'EXPENSE'})}
                    style={{
                      background: editForm.type === 'EXPENSE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: editForm.type === 'EXPENSE' ? 'var(--danger)' : 'var(--border)',
                      color: editForm.type === 'EXPENSE' ? 'var(--danger)' : 'var(--text-muted)'
                    }}
                  >
                    ব্যয় (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="reset-label">তারিখ (Date)</label>
                <input 
                  type="date" 
                  className="input" 
                  value={editForm.date} 
                  onChange={e => setEditForm({...editForm, date: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="reset-label">বিবরণ (Description)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="reset-label">পরিমাণ (Amount ৳)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  className="input" 
                  value={editForm.amount || ''} 
                  onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})} 
                  required 
                />
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ minWidth: '120px' }}>
                  {submitLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: 72, height: 72, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'white' }}>লেনদেন ডিলিট করবেন?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Are you sure you want to delete this ledger entry? This action cannot be undone and will permanently recalculate all subsequent running balances.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteId(null)} disabled={submitLoading}>
                Cancel
              </button>
              <button className="btn" style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none' }} onClick={() => handleDelete(deleteId)} disabled={submitLoading}>
                {submitLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
