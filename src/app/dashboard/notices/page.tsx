'use client';
import { useState, useEffect } from 'react';
import { Megaphone, Plus, Send, Trash2, X } from 'lucide-react';

export default function NoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '' });

  const fetchNotices = async () => {
    const res = await fetch('/api/notices');
    const data = await res.json();
    setNotices(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setForm({ title: '', content: '' });
      setShowModal(false);
      fetchNotices();
    }
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Create Notice
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? <p>Loading notices...</p> : notices.length === 0 ? <p>No notices published yet.</p> : notices.map(notice => (
          <div key={notice.id} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, background: '#fef3c7', color: '#d97706', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{notice.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Published on {new Date(notice.createdAt).toLocaleDateString()}
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{notice.content}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <button className="btn btn-outline" style={{ color: '#25d366', borderColor: '#25d366' }} onClick={() => sendToWhatsApp(notice)}>
                  <Send size={16} style={{ marginRight: '0.4rem' }} /> Share on WhatsApp
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Notice</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>Notice Title</label>
                <input type="text" className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Monthly Meeting" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>Content</label>
                <textarea className="input" required rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write notice details here..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Publish Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
