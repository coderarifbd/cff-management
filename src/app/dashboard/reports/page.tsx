'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { NotoSansBengaliBase64 } from '@/lib/fonts/NotoSansBengali';
import html2canvas from 'html2canvas';
import { formatDate } from '@/lib/utils';

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
  const [activeReportType, setActiveReportType] = useState<'monthly' | 'annual'>('monthly');
  
  const [filters, setFilters] = useState({
    invest: true,
    profit: true,
    income: true,
    otherIncome: true,
    expense: true
  });

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

  const fetchReportData = useCallback(async (type: 'monthly' | 'annual') => {
    let url = `/api/reports?type=${type}`;
    if (type === 'monthly') url += `&month=${monthlyMonth}&year=${monthlyYear}`;
    if (type === 'annual') url += `&year=${annualYear}`;
    
    url += `&_t=${new Date().getTime()}`; // Cache buster

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  }, [monthlyMonth, monthlyYear, annualYear]);

  const handleViewReport = useCallback(async (type: 'monthly' | 'annual') => {
    setActiveReportType(type);
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
  }, [fetchReportData, monthlyMonth, monthlyYear, annualYear, months]);

  const handleDownloadPDF = async (type: 'monthly' | 'annual') => {
    setLoadingType(`${type}-pdf`);
    try {
      // First ensure preview data is loaded
      await handleViewReport(type);

      // Wait for DOM to fully render
      await new Promise(resolve => setTimeout(resolve, 1500));

      const headerElement = document.getElementById('report-header');
      const bodyElement = document.getElementById('report-body');
      
      if (!headerElement || !bodyElement) {
        alert('Please click View first to load the report preview.');
        setLoadingType('');
        return;
      }

      // 1. Capture Header & Body separately
      const headerCanvas = await html2canvas(headerElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const bodyCanvas = await html2canvas(bodyElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      
      // Calculate Header height in mm
      const headerImgWidth = contentWidth;
      const headerImgHeight = (headerCanvas.height * headerImgWidth) / headerCanvas.width;
      const headerData = headerCanvas.toDataURL('image/png');

      // Calculate Footer height (fixed text for now)
      const footerHeight = 10;
      const footerY = pageHeight - margin;

      // Calculate available space for body on each page
      const bodyAvailableHeight = pageHeight - headerImgHeight - footerHeight - (margin * 3);
      
      // Body image details
      const bodyImgWidth = contentWidth;
      const bodyImgHeight = (bodyCanvas.height * bodyImgWidth) / bodyCanvas.width;
      const bodyData = bodyCanvas.toDataURL('image/jpeg', 0.9);

      let heightLeft = bodyImgHeight;
      let pageNum = 0;
      let sourceY = 0; // The Y position in the original body canvas (scaled to mm)

      while (heightLeft > 2) { // Use 2mm threshold to avoid extra blank pages from rounding errors
        if (pageNum > 0) doc.addPage();
        pageNum++;

        // --- Add Header ---
        doc.addImage(headerData, 'PNG', margin, margin, headerImgWidth, headerImgHeight);

        // --- Add Body Slice ---
        const pixelsPerMm = bodyCanvas.width / bodyImgWidth;
        const remainingHeightPx = bodyCanvas.height - (sourceY * pixelsPerMm);
        
        if (remainingHeightPx <= 0) break;

        const sliceHeightPx = Math.min((bodyAvailableHeight * pixelsPerMm), remainingHeightPx);
        
        if (sliceHeightPx <= 1) break;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = bodyCanvas.width;
        sliceCanvas.height = sliceHeightPx;
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            bodyCanvas, 
            0, sourceY * pixelsPerMm, bodyCanvas.width, sliceHeightPx, 
            0, 0, bodyCanvas.width, sliceHeightPx
          );
          
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.9);
          const sliceHeightMm = (sliceCanvas.height * bodyImgWidth) / sliceCanvas.width;
          
          if (!isNaN(sliceHeightMm) && sliceHeightMm > 0) {
            doc.addImage(sliceData, 'JPEG', margin, margin + headerImgHeight + margin, bodyImgWidth, sliceHeightMm);
          }
        }

        // --- Add Footer ---
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        const footerText = `CFF Financial Report | Generated: ${formatDate(new Date())} | Page ${pageNum}`;
        doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
        
        // --- Update loop vars ---
        const mmAdvanced = (sliceCanvas.height * bodyImgWidth) / bodyCanvas.width;
        heightLeft -= mmAdvanced;
        sourceY += mmAdvanced;

        if (mmAdvanced <= 0) break;
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

      // Collections Sheet (Member Income)
      if (filters.income) {
        const paidPayments = data.payments.filter((p: any) => p.isPaid).map((p: any) => ({
          'Member Name': p.user.name,
          'Member ID': p.user.memberNo,
          'Fee Amount': p.amount,
          'Late Fine': p.fine,
          'Total Collected': p.amount + p.fine
        }));
        const wsCollections = XLSX.utils.json_to_sheet(paidPayments);
        XLSX.utils.book_append_sheet(wb, wsCollections, 'Member Income');
      }

      // Other Incomes Sheet
      if (filters.otherIncome) {
        const otherIncomesData = data.incomes.map((inc: any) => ({
          'Date': formatDate(inc.date),
          'Category': inc.category,
          'Description': inc.description,
          'Amount': inc.amount
        }));
        const wsOtherIncomes = XLSX.utils.json_to_sheet(otherIncomesData);
        XLSX.utils.book_append_sheet(wb, wsOtherIncomes, 'Other Income');
      }

      // Expenses Sheet
      if (filters.expense) {
        const expensesData = data.expenses.map((e: any) => ({
          'Date': formatDate(e.date),
          'Category': e.category,
          'Description': e.description,
          'Amount': e.amount
        }));
        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');
      }

      // Investments Sheet
      if (filters.invest) {
        const investmentsData = data.investments.map((inv: any) => ({
          'Date': formatDate(inv.date),
          'Investment Project': inv.title,
          'Type': inv.type || '-',
          'Amount Invested': inv.amount
        }));
        const wsInvestments = XLSX.utils.json_to_sheet(investmentsData);
        XLSX.utils.book_append_sheet(wb, wsInvestments, 'Investments');
      }

      // Profits Sheet
      if (filters.profit) {
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
        XLSX.utils.book_append_sheet(wb, wsProfits, 'Investment Profits');
      }

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

      <div className="card no-print" style={{ marginBottom: '2rem', background: 'rgba(21, 128, 61, 0.05)', borderColor: 'rgba(21, 128, 61, 0.2)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--primary-light)' }}>Report Data Options</h3>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
            <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} checked={filters.income} onChange={e => setFilters({...filters, income: e.target.checked})} />
            <span>Member Income</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
            <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} checked={filters.otherIncome} onChange={e => setFilters({...filters, otherIncome: e.target.checked})} />
            <span>Other Income</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
            <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} checked={filters.expense} onChange={e => setFilters({...filters, expense: e.target.checked})} />
            <span>Expenses</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
            <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} checked={filters.invest} onChange={e => setFilters({...filters, invest: e.target.checked})} />
            <span>Investments</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
            <input type="checkbox" style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} checked={filters.profit} onChange={e => setFilters({...filters, profit: e.target.checked})} />
            <span>Investment Profits</span>
          </label>
        </div>
      </div>

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
        const totalOtherIncomes = previewData.incomes.reduce((sum: number, inc: any) => sum + inc.amount, 0);
        const totalExpenses = previewData.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
        const totalProfits = previewData.profits.reduce((sum: number, p: any) => sum + p.amount, 0);
        
        // Calculate net balance based on ALL data, or just filtered?
        // Usually, the report summary should show what's in the report.
        let displayTotalIn = 0;
        if (filters.income) displayTotalIn += totalCollected;
        if (filters.otherIncome) displayTotalIn += totalOtherIncomes;
        if (filters.profit) displayTotalIn += totalProfits;
        
        let displayTotalOut = 0;
        if (filters.expense) displayTotalOut += totalExpenses;
        
        const netBalance = displayTotalIn - displayTotalOut;

        return (
          <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div id="report-preview-pane" className="card" style={{ padding: '3rem', background: 'white', color: '#1e293b', border: 'none', borderRadius: '16px' }}>

            {/* Action bar - hidden in PDF */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} data-html2canvas-ignore="true">
              <button className="btn btn-outline" onClick={() => setPreviewData(null)}>✕ Close Preview</button>
            </div>

            {/* Official Report Header - included in PDF */}
            <div id="report-header" style={{ textAlign: 'center', borderBottom: '3px solid #1a7a4a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a7a4a', letterSpacing: '0.05em' }}>চাকালমুয়া ফ্রেন্ডস ফেডারেশন</div>
              <div style={{ fontSize: '1rem', color: '#555', marginTop: '0.25rem' }}>Chakalmua Friends Federation (CFF)</div>
              <div style={{ marginTop: '1.5rem', display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.4rem 1.5rem' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#15803d' }}>{previewTitle}</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>Generated on: {formatDate(new Date())}</div>
            </div>

            <div id="report-body">

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {filters.income && (
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Member Collections</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>৳ {totalCollected}</div>
                </div>
              )}
              {filters.otherIncome && (
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Other Incomes</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>৳ {totalOtherIncomes}</div>
                </div>
              )}
              {filters.expense && (
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Total Expenses</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>- ৳ {totalExpenses}</div>
                </div>
              )}
              {filters.profit && (
                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Investment Profits</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>+ ৳ {totalProfits}</div>
                </div>
              )}
              <div style={{ background: netBalance >= 0 ? '#ecfdf5' : '#fef2f2', padding: '1.25rem', borderRadius: '8px', border: `1px solid ${netBalance >= 0 ? '#10b981' : '#ef4444'}` }}>
                <div style={{ color: netBalance >= 0 ? '#047857' : '#b91c1c', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Net Report Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: netBalance >= 0 ? '#047857' : '#b91c1c' }}>৳ {netBalance}</div>
              </div>
            </div>

            {/* Collections Table */}
            {filters.income && (
              <>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>
                  {activeReportType === 'monthly' ? 'Fee Collections (Member Wise)' : 'Monthly Collections Summary'}
                </h4>
                <div style={{ overflowX: 'auto', marginBottom: '2rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <table style={{ margin: 0 }}>
                    {activeReportType === 'monthly' ? (
                      <>
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
                        </tbody>
                      </>
                    ) : (
                      <>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Collection Count</th>
                            <th>Total Fees</th>
                            <th>Total Fines</th>
                            <th style={{ textAlign: 'right' }}>Total Collected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paidPayments.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center' }}>No collections found for this year</td></tr>}
                          {Array.from({ length: 12 }, (_, i) => {
                            const m = i + 1;
                            const monthPayments = paidPayments.filter((p: any) => p.month === m);
                            const totalFee = monthPayments.reduce((s: number, p: any) => s + p.amount, 0);
                            const totalFine = monthPayments.reduce((s: number, p: any) => s + p.fine, 0);
                            if (monthPayments.length === 0) return null;
                            return (
                              <tr key={m}>
                                <td style={{ fontWeight: 600 }}>{months[i].label}</td>
                                <td>{monthPayments.length}</td>
                                <td>৳ {totalFee}</td>
                                <td style={{ color: totalFine > 0 ? 'var(--danger)' : 'inherit' }}>৳ {totalFine}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>৳ {totalFee + totalFine}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}
                    {/* Footer total row */}
                    {paidPayments.length > 0 && (
                      <tfoot>
                        <tr style={{ background: '#f0fdf4', fontWeight: 700, borderTop: '2px solid #10b981' }}>
                          <td colSpan={activeReportType === 'monthly' ? 3 : 2} style={{ fontWeight: 700 }}>GRAND TOTAL</td>
                          {activeReportType === 'annual' && <td>{paidPayments.length}</td>}
                          <td>৳ {paidPayments.reduce((s: number, p: any) => s + p.amount, 0)}</td>
                          <td style={{ color: 'var(--danger)' }}>৳ {paidPayments.reduce((s: number, p: any) => s + p.fine, 0)}</td>
                          <td style={{ textAlign: 'right' }}>৳ {paidPayments.reduce((s: number, p: any) => s + p.amount + p.fine, 0)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}

            {/* Other Incomes Table */}
            {filters.otherIncome && (
              <>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--success)' }}>Other Incomes</h4>
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
                      {previewData.incomes.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>No other incomes found</td></tr>}
                      {previewData.incomes.map((inc: any) => (
                        <tr key={inc.id}>
                          <td>{formatDate(inc.date)}</td>
                          <td>{inc.category}</td>
                          <td>{inc.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>৳ {inc.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Expenses Table */}
            {filters.expense && (
              <>
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
                          <td>{formatDate(e.date)}</td>
                          <td>{e.category}</td>
                          <td>{e.description || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>- ৳ {e.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Investments Table */}
            {filters.invest && (
              <>
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
                          <td>{formatDate(inv.date)}</td>
                          <td style={{ fontWeight: 600 }}>{inv.title}</td>
                          <td>{inv.type || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>৳ {inv.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {/* Profits Table */}
            {filters.profit && (
              <>
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
              </>
            )}
            
            {/* Final Financial Summary Footer */}
            <div style={{ marginTop: '4rem', borderTop: '2px solid #1a7a4a', paddingTop: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1a7a4a', marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Income Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Member Fee Collections:</span>
                      <span style={{ fontWeight: 600 }}>৳ {filters.income ? totalCollected.toLocaleString() : '0 (Excluded)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Other Income Sources:</span>
                      <span style={{ fontWeight: 600 }}>৳ {filters.otherIncome ? totalOtherIncomes.toLocaleString() : '0 (Excluded)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Investment Profits:</span>
                      <span style={{ fontWeight: 600 }}>৳ {filters.profit ? totalProfits.toLocaleString() : '0 (Excluded)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '2px solid #f1f5f9', fontWeight: 800, fontSize: '1.125rem', color: '#1e293b' }}>
                      <span>Total Gross Income:</span>
                      <span>৳ {( (filters.income ? totalCollected : 0) + (filters.otherIncome ? totalOtherIncomes : 0) + (filters.profit ? totalProfits : 0) ).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ef4444', marginBottom: '1.25rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Expense Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>General Operating Expenses:</span>
                      <span style={{ fontWeight: 600 }}>৳ {filters.expense ? totalExpenses.toLocaleString() : '0 (Excluded)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '2px solid #f1f5f9', fontWeight: 800, fontSize: '1.125rem', color: '#1e293b' }}>
                      <span>Total Expenditure:</span>
                      <span>৳ {(filters.expense ? totalExpenses : 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: netBalance >= 0 ? '#f0fdf4' : '#fef2f2', padding: '1.25rem 3rem', borderRadius: '12px', border: `2px solid ${netBalance >= 0 ? '#bbf7d0' : '#fecaca'}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: netBalance >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Net Report Balance</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: netBalance >= 0 ? '#15803d' : '#ef4444' }}>৳ {netBalance.toLocaleString()}</div>
                </div>
              </div>

              {/* Signature Area */}
              <div style={{ marginTop: '6rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
                <div>
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.5rem', width: '180px', margin: '0 auto' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Prepared By</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Accountant / Treasurer</p>
                  </div>
                </div>
                <div>
                  {/* Empty middle for spacing or third signature if needed */}
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.5rem', width: '180px', margin: '0 auto' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Approved By</p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>President / Secretary</p>
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                This is a computer-generated report and is valid without a physical signature. Verified by CFF Management System.
              </div>
            </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
