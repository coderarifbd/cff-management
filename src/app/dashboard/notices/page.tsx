'use client';
import { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, Trash2, X, Edit2, AlertTriangle, Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function NoticesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('notices', 'EDIT');
  const canDelete = hasPermission('notices', 'FULL');

  const [notices, setNotices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [error, setError] = useState('');

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotices(data);
        setError('');
      } else {
        setError(data.error || 'Failed to load notices');
      }
    } catch (err) {
      setError('An error occurred while fetching notices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotices(); }, []);

  const openEditModal = (notice: any) => {
    setEditId(notice.id);
    setForm({ title: notice.title, content: notice.content });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ title: '', content: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const url = editId ? `/api/notices/${editId}` : '/api/notices';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        closeModal();
        fetchNotices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteId(null);
        fetchNotices();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const copyNotice = (notice: any) => {
    const text = `📢 *${notice.title}*\n\n${notice.content}\n\n_Regards,_\n_CFF Administration_`;
    navigator.clipboard.writeText(text);
    setCopiedId(notice.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareNotice = async (notice: any) => {
    const shareData = {
      title: notice.title,
      text: `📢 ${notice.title}\n\n${notice.content}\n\n- CFF Administration`,
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      copyNotice(notice);
    }
  };

  const sendToMessenger = (notice: any) => {
    const text = `📢 *${notice.title}*\n\n${notice.content}\n\n_Regards,_\n_CFF Administration_`;
    // Messenger sharing link (direct to messages)
    const url = `https://www.facebook.com/messages/t/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sendToWhatsApp = (notice: any) => {
    const text = `📢 *${notice.title}*\n\n${notice.content}\n\n_Regards,_\n_CFF Administration_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Notice Board</h2>
          <p style={{ color: 'var(--text-muted)' }}>Publish and share federation updates.</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Create Notice
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <p>Loading notices...</p>
        ) : error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--danger)' }}>
            <AlertTriangle size={32} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Note: This might be due to a pending database sync. Try restarting your development server.
            </p>
          </div>
        ) : !Array.isArray(notices) || notices.length === 0 ? (
          <p>No notices published yet.</p>
        ) : (
          notices.map(notice => (
            <div key={notice.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Header: Icon, Title, and Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', margin: 0 }}>{notice.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Published on {formatDate(notice.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions container (with wrap support) */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" style={{ color: copiedId === notice.id ? '#4ade80' : '#94a3b8', borderColor: copiedId === notice.id ? 'rgba(74, 222, 128, 0.2)' : 'rgba(148, 163, 184, 0.2)', padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => copyNotice(notice)} title="Copy to clipboard">
                    {copiedId === notice.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button className="btn btn-outline" style={{ color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)', padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => shareNotice(notice)} title="Universal Share">
                    <Share2 size={14} />
                  </button>
                  <button className="btn btn-outline" style={{ color: '#00B2FF', borderColor: 'rgba(0, 178, 255, 0.2)', padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => sendToMessenger(notice)} title="Share on Messenger">
                    <MessageCircle size={14} />
                  </button>
                  <button className="btn btn-outline" style={{ color: '#25d366', borderColor: 'rgba(37, 211, 102, 0.2)', padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => sendToWhatsApp(notice)} title="Share on WhatsApp">
                    <Send size={14} />
                  </button>
                  {canEdit && (
                    <>
                      <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 0.1rem' }}></div>
                      <button className="btn btn-outline" style={{ padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEditModal(notice)} title="Edit Notice">
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '0.4rem', height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteId(notice.id)} title="Delete Notice">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Content body */}
              <div style={{ paddingLeft: '0.25rem' }}>
                <p style={{ whiteSpace: 'pre-wrap', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.925rem', lineHeight: 1.6, margin: 0 }}>{notice.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>{editId ? 'Update Notice' : 'Create New Notice'}</h3>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notice Title</label>
                <input type="text" className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Monthly Meeting" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content Details</label>
                <textarea className="input" required rows={8} style={{ resize: 'vertical' }} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write notice details here..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} style={{ flex: 1 }}>Discard</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : editId ? 'Update Notice' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1.5rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: 72, height: 72, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <AlertTriangle size={36} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Delete Notice?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Are you sure you want to delete this notice? This action will remove it from all member dashboards permanently.
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
