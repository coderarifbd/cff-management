'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NotoSansBengaliBase64 } from '@/lib/fonts/NotoSansBengali';
import html2canvas from 'html2canvas';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);
  const [monthlyYear, setMonthlyYear] = useState(currentYear);
  const [annualYear, setAnnualYear] = useState(currentYear);

  const [loadingType, setLoadingType] = useState('');
  const [minYear, setMinYear] = useState(2019);
  
  // Preview States
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports/years')
      .then(res => res.json())
      .then(data => {
        if (data.minYear) setMinYear(data.minYear);
      })
      .catch(console.error);
  }, []);

  // Generate dynamic years from database minimum to currentYear + 1
  const years = Array.from({ length: currentYear - minYear + 2 }, (_, i) => currentYear + 1 - i);

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const fetchReportData = async (type: 'monthly' | 'annual') => {
    let url = `/api/reports?type=${type}`;
    if (type === 'monthly') url += `&month=${monthlyMonth}&year=${monthlyYear}`;
    if (type === 'annual') url += `&year=${annualYear}`;
    
    url += `&_t=${new Date().getTime()}`; // Cache buster

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  };

  const handleViewReport = async (type: 'monthly' | 'annual') => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const data = await fetchReportData(type);
      const title = type === 'monthly' ? `Monthly Report - ${months.find(m => m.value === monthlyMonth)?.label} ${monthlyYear}` : `Annual Audit Report - ${annualYear}`;
      setPreviewData(data);
      setPreviewTitle(title);
    } catch (error) {
      alert('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownloadPDF = async (type: 'monthly' | 'annual') => {
    setLoadingType(`${type}-pdf`);
    try {
      // First ensure preview data is loaded
      await handleViewReport(type);

      // Wait for DOM to fully render
      await new Promise(resolve => setTimeout(resolve, 1200));

      const element = document.getElementById('report-preview-pane');
      if (!element) {
        alert('Please click View first to load the report preview.');
        setLoadingType('');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Use JPEG with 80% quality to keep file size small
      const imgData = canvas.toDataURL('image/jpeg', 0.80);
      const doc = new jsPDF('p', 'mm', 'a4');

      const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const contentHeight = pageHeight;
      let heightLeft = imgHeight;
      let pageNum = 0;

      // First page
      doc.addImage(imgData, 'JPEG', 0, -(pageNum * pageHeight), imgWidth, imgHeight);
      heightLeft -= contentHeight;

      // Additional pages
      while (heightLeft > 0) {
        pageNum++;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, -(pageNum * pageHeight), imgWidth, imgHeight);
        heightLeft -= contentHeight;
      }

      const title = type === 'monthly'
        ? `Monthly_Report_${monthlyYear}_${monthlyMonth}`
        : `Annual_Audit_Report_${annualYear}`;

      doc.save(`${title}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoadingType('');
    }
  };

  const handleDownloadExcel = async (type: 'monthly' | 'annual') => {
    setLoadingType(`${type}-excel`);
    try {
      const data = await fetchReportData(type);
      const title = type === 'monthly' ? `Monthly_Report_${monthlyYear}_${monthlyMonth}` : `Annual_Report_${annualYear}`;

      const wb = XLSX.utils.book_new();

      // Collections Sheet
      const paidPayments = data.payments.filter((p: any) => p.isPaid).map((p: any) => ({
        'Member Name': p.user.name,
        'Member ID': p.user.memberNo,
        'Fee Amount': p.amount,
        'Late Fine': p.fine,
        'Total Collected': p.amount + p.fine
      }));
      const wsCollections = XLSX.utils.json_to_sheet(paidPayments);
      XLSX.utils.book_append_sheet(wb, wsCollections, 'Collections');

      // Expenses Sheet
      const expensesData = data.expenses.map((e: any) => ({
        'Date': new Date(e.date).toLocaleDateString(),
        'Category': e.category,
        'Description': e.description,
        'Amount': e.amount
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

      // Investments Sheet
      const investmentsData = data.investments.map((inv: any) => ({
        'Date': new Date(inv.date).toLocaleDateString(),
        'Investment Project': inv.title,
        'Type': inv.type || '-',
        'Amount Invested': inv.amount
      }));
      const wsInvestments = XLSX.utils.json_to_sheet(investmentsData);
      XLSX.utils.book_append_sheet(wb, wsInvestments, 'Investments');

      // Profits Sheet
      const profitSummaryArray = Object.values(data.profits.reduce((acc: any, p: any) => {
        const title = p.investment?.title || 'Unknown Project';
        if (!acc[title]) acc[title] = { title, amount: 0, count: 0 };
        acc[title].amount += p.amount;
        acc[title].count += 1;
        return acc;
      }, {}));
      
      const profitsData = profitSummaryArray.map((inv: any) => ({
        'Investment Project': inv.title,
        'Number of Payouts': inv.count,
        'Total Profit Generated': inv.amount
      }));
      const wsProfits = XLSX.utils.json_to_sheet(profitsData);
      XLSX.utils.book_append_sheet(wb, wsProfits, 'Profits');

      XLSX.writeFile(wb, `${title}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Excel');
    } finally {
      setLoadingType('');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem' }}>Generate Reports</h2>

      <div className="grid-2">
        {/* Monthly Report Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-primary" /> Monthly Statement
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '48px' }}>Generate a complete PDF or Excel statement for collections, expenses, and current balances for a given month.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <select className="input" value={monthlyMonth} onChange={e => setMonthlyMonth(parseInt(e.target.value))}>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select className="input" value={monthlyYear} onChange={e => setMonthlyYear(parseInt(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary no-print" style={{ flex: 1 }} onClick={() => handleViewReport('monthly')} disabled={previewLoading}>
                <FileText size={18} /> View
              </button>
              <button className="btn btn-outline no-print" style={{ flex: 1 }} onClick={() => handleDownloadPDF('monthly')} disabled={loadingType === 'monthly-pdf'}>
                <Download size={18} style={{ marginRight: '0.5rem' }} /> {loadingType === 'monthly-pdf' ? '...' : 'PDF'}
              </button>
              <button className="btn btn-outline no-print" style={{ flex: 1 }} onClick={() => handleDownloadExcel('monthly')} disabled={loadingType === 'monthly-excel'}>
                <Download size={18} style={{ marginRight: '0.5rem' }} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* Annual Report Card */}
        <div className="card no-print">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-primary" /> Annual Audit Report
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', minHeight: '48px' }}>Generate an aggregated report for the whole year detailing all collections, expenses, and profit margins.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <select className="input" value={annualYear} onChange={e => setAnnualYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary no-print" style={{ flex: 1 }} onClick={() => handleViewReport('annual')} disabled={previewLoading}>
                <FileText size={18} /> View
              </button>
              <button className="btn btn-outline no-print" style={{ flex: 1 }} onClick={() => handleDownloadPDF('annual')} disabled={loadingType === 'annual-pdf'}>
                <Download size={18} style={{ marginRight: '0.5rem' }} /> {loadingType === 'annual-pdf' ? '...' : 'PDF'}
              </button>
              <button className="btn btn-outline no-print" style={{ flex: 1 }} onClick={() => handleDownloadExcel('annual')} disabled={loadingType === 'annual-excel'}>
                <Download size={18} style={{ marginRight: '0.5rem' }} /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {previewLoading && <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report preview...</div>}
      
      {previewData && !previewLoading && (() => {
        const paidPayments = previewData.payments.filter((p: any) => p.isPaid);
        const totalCollected = paidPayments.reduce((sum: number, p: any) => sum + p.amount + p.fine, 0);
        const totalExpenses = previewData.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
        const totalProfits = previewData.profits.reduce((sum: number, p: any) => sum + p.amount, 0);
        const netBalance = totalCollected + totalProfits - totalExpenses;

        return (
          <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div id="report-preview-pane" className="card" style={{ padding: '3rem', background: 'white', color: '#1e293b', border: 'none', borderRadius: '16px' }}>

            {/* Action bar - hidden in PDF */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} data-html2canvas-ignore="true">
              <button className="btn btn-outline" onClick={() => setPreviewData(null)}>✕ Close Preview</button>
            </div>

            {/* Official Report Header - included in PDF */}
            <div style={{ textAlign: 'center', borderBottom: '3px solid #1a7a4a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a7a4a', letterSpacing: '0.05em' }}>চাকালমুয়া ফ্রেন্ডস ফেডারেশন</div>
              <div style={{ fontSize: '1rem', color: '#555', marginTop: '0.25rem' }}>Chakalmua Friends Federation (CFF)</div>
              <div style={{ marginTop: '1rem', display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.4rem 1.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#15803d' }}>{previewTitle}</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Collections</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>৳ {totalCollected}</div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Expenses</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>- ৳ {totalExpenses}</div>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Investment Profits</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>+ ৳ {totalProfits}</div>
              </div>
              <div style={{ background: netBalance >= 0 ? '#ecfdf5' : '#fef2f2', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${netBalance >= 0 ? '#10b981' : '#ef4444'}` }}>
                <div style={{ color: netBalance >= 0 ? '#047857' : '#b91c1c', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Net Period Balance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: netBalance >= 0 ? '#047857' : '#b91c1c' }}>৳ {netBalance}</div>
              </div>
            </div>

            {/* Collections Table */}
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>Fee Collections</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Member ID</th>
                    <th>Months Paid</th>
                    <th>Total Fee</th>
                    <th>Late Fine</th>
                    <th style={{ textAlign: 'right' }}>Total Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {paidPayments.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>No collections found</td></tr>}
                  {Object.entries(
                    paidPayments.reduce((acc: any, p: any) => {
                      const key = p.userId || p.user?.id || p.user?.memberNo;
                      if (!acc[key]) {
                        acc[key] = {
                          name: p.user.name,
                          memberNo: p.user.memberNo || '-',
                          months: 0,
                          totalFee: 0,
                          totalFine: 0,
                          payments: [],
                        };
                      }
                      acc[key].months += 1;
                      acc[key].totalFee += p.amount;
                      acc[key].totalFine += p.fine;
                      acc[key].payments.push(p);
                      return acc;
                    }, {})
                  ).map(([key, m]: [string, any], idx: number) => {
                    const isExpanded = expandedMember === key;
                    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    return (
                      <React.Fragment key={key}>
                        <tr
                          key={idx}
                          onClick={() => setExpandedMember(isExpanded ? null : key)}
                          style={{ cursor: 'pointer', background: isExpanded ? '#f0fdf4' : 'inherit', transition: 'background 0.2s' }}
                        >
                          <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                            {m.name}
                          </td>
                          <td>{m.memberNo}</td>
                          <td style={{ textAlign: 'center' }}>{m.months}</td>
                          <td>৳ {m.totalFee}</td>
                          <td style={{ color: m.totalFine > 0 ? 'var(--danger)' : 'inherit' }}>৳ {m.totalFine}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>৳ {m.totalFee + m.totalFine}</td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${idx}-detail`}>
                            <td colSpan={6} style={{ padding: 0, background: '#f9fafb' }}>
                              <table style={{ margin: 0, width: '100%', borderTop: '1px dashed #d1fae5', borderBottom: '1px dashed #d1fae5' }}>
                                <thead>
                                  <tr style={{ background: '#ecfdf5' }}>
                                    <th style={{ paddingLeft: '2.5rem', color: '#065f46', fontSize: '0.8rem' }}>Month</th>
                                    <th style={{ color: '#065f46', fontSize: '0.8rem' }}>Year</th>
                                    <th style={{ color: '#065f46', fontSize: '0.8rem' }}>Fee</th>
                                    <th style={{ color: '#065f46', fontSize: '0.8rem' }}>Fine</th>
                                    <th style={{ color: '#065f46', fontSize: '0.8rem', textAlign: 'right' }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.payments.map((p: any) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #d1fae5' }}>
                                      <td style={{ paddingLeft: '2.5rem', fontSize: '0.875rem' }}>{monthNames[p.month - 1]}</td>
                                      <td style={{ fontSize: '0.875rem' }}>{p.year}</td>
                                      <td style={{ fontSize: '0.875rem' }}>৳ {p.amount}</td>
                                      <td style={{ fontSize: '0.875rem', color: p.fine > 0 ? 'var(--danger)' : 'inherit' }}>৳ {p.fine}</td>
                                      <td style={{ fontSize: '0.875rem', textAlign: 'right', fontWeight: 600 }}>৳ {p.amount + p.fine}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {/* Footer total row */}
                  {paidPayments.length > 0 && (
                    <tr style={{ background: '#f0fdf4', fontWeight: 700, borderTop: '2px solid #10b981' }}>
                      <td colSpan={3} style={{ fontWeight: 700 }}>GRAND TOTAL</td>
                      <td>৳ {paidPayments.reduce((s: number, p: any) => s + p.amount, 0)}</td>
                      <td style={{ color: 'var(--danger)' }}>৳ {paidPayments.reduce((s: number, p: any) => s + p.fine, 0)}</td>
                      <td style={{ textAlign: 'right' }}>৳ {paidPayments.reduce((s: number, p: any) => s + p.amount + p.fine, 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expenses Table */}
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--danger)' }}>Expenses</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.expenses.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>No expenses found</td></tr>}
                  {previewData.expenses.map((e: any) => (
                    <tr key={e.id}>
                      <td>{new Date(e.date).toLocaleDateString()}</td>
                      <td>{e.category}</td>
                      <td>{e.description || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>- ৳ {e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Investments Table */}
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>New Investments Started</h4>
            <div style={{ overflowX: 'auto', marginBottom: '2rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Date Started</th>
                    <th>Investment Project</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount Invested</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.investments.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>No new investments started in this period</td></tr>}
                  {previewData.investments.map((inv: any) => (
                    <tr key={inv.id}>
                      <td>{new Date(inv.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{inv.title}</td>
                      <td>{inv.type || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>৳ {inv.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Profits Table */}
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--success)' }}>Investment Profits Summary</h4>
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Investment Project</th>
                    <th>Number of Payouts</th>
                    <th style={{ textAlign: 'right' }}>Total Profit Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(previewData.profits.reduce((acc: any, p: any) => {
                    const title = p.investment?.title || 'Unknown Project';
                    if (!acc[title]) acc[title] = { title, amount: 0, count: 0 };
                    acc[title].amount += p.amount;
                    acc[title].count += 1;
                    return acc;
                  }, {})).map((inv: any) => (
                    <tr key={inv.title}>
                      <td style={{ fontWeight: 600 }}>{inv.title}</td>
                      <td>{inv.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>+ ৳ {inv.amount}</td>
                    </tr>
                  ))}
                  {previewData.profits.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center' }}>No profits generated in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
