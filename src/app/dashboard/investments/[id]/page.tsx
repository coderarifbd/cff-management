'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Plus, Printer, TrendingUp, Upload, X, CheckCircle2, Trash2, Eye } from 'lucide-react';
import { uploadFileAction } from '@/app/actions/uploadAction';

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
  
  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Document Upload State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const fetchInvestment = async () => {
    try {
      const res = await fetch(`/api/investments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvestment(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load investment');
      }
    } catch (err: any) {
      setError('System error: ' + err.message);
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

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setDocLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      const uploadData = await uploadFileAction(formData);
      
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
      
      const res = await fetch(`/api/investments/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploadData.url, name: docFile.name })
      });
      
      if (!res.ok) throw new Error('Failed to add document');
      
      setShowDocModal(false);
      setDocFile(null);
      await fetchInvestment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/investments/${id}/documents?docId=${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) await fetchInvestment();
      else throw new Error('Failed to delete document');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '1rem' }}></div>
        <p>Loading investment details...</p>
      </div>
    </div>
  );

  if (error || !investment) return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)' }}>
      <div style={{ width: 80, height: 80, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
        <X size={40} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Oops! Something went wrong</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error || 'The investment record you are looking for could not be found.'}</p>
      <button className="btn btn-primary" onClick={() => router.push('/dashboard/investments')}>
        Back to Investments
      </button>
    </div>
  );

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
          <button 
            onClick={() => setShowDocModal(true)} 
            className="btn btn-outline no-print" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={18} /> Add Document
          </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        {/* Profit History */}
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
                </tr>
              </thead>
              <tbody>
                {(!investment.profits || investment.profits.length === 0) ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No profit recorded yet.</td></tr>
                ) : (
                  investment.profits.map((p: any) => (
                    <tr key={p.id}>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>+ ৳ {p.amount}</td>
                      <td>{p.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Documents Section */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <FileText size={20} color="var(--primary)" /> Investment Papers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(!investment.documents || investment.documents.length === 0) && !investment.documentUrl ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No documents uploaded yet.</p>
              </div>
            ) : (
              <>
                {/* Legacy Document if exists */}
                {investment.documentUrl && (
                  <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <FileText size={20} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Primary Document (Legacy)</span>
                    </div>
                    <button onClick={() => setPreviewUrl(investment.documentUrl)} className="btn btn-outline" style={{ padding: '0.4rem' }}><Eye size={16} /></button>
                  </div>
                )}
                {/* Multi-documents */}
                {investment.documents?.map((doc: any) => (
                  <div key={doc.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <FileText size={20} color="var(--primary)" />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setPreviewUrl(doc.url)} className="btn btn-outline" style={{ padding: '0.4rem' }} title="View"><Eye size={16} /></button>
                      <button onClick={() => handleDeleteDoc(doc.id)} className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </>
            )}
            <button 
              onClick={() => setShowDocModal(true)} 
              className="btn btn-outline no-print" 
              style={{ marginTop: '0.5rem', width: '100%', borderStyle: 'dashed' }}
            >
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add New Paper
            </button>
          </div>
        </div>
      </div>
      
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

      {/* Document Upload Modal */}
      {showDocModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Upload Document</h3>
              <button onClick={() => setShowDocModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
            </div>
            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleDocUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <input type="file" id="detailDoc" style={{ display: 'none' }} accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={e => setDocFile(e.target.files?.[0] || null)} />
                <label htmlFor="detailDoc" style={{ cursor: 'pointer' }}>
                  <div style={{ width: 64, height: 64, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Upload size={32} />
                  </div>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Click to select file</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PDF, Word, Excel or Images up to 10MB</p>
                </label>
                {docFile && (
                  <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docFile.name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowDocModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={docLoading || !docFile}>
                  {docLoading ? 'Uploading...' : 'Upload Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
