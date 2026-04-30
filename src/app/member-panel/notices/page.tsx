'use client';
import { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, X } from 'lucide-react';

export default function MemberNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  useEffect(() => {
    const savedHidden = localStorage.getItem('cff_read_notices');
    const localHiddenIds = savedHidden ? JSON.parse(savedHidden) : [];

    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        const mergedNotices = (Array.isArray(data) ? data : []).map(n => ({
          ...n,
          isRead: n.isRead || localHiddenIds.includes(n.id)
        }));
        setNotices(mergedNotices);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Notice Board</h2>
        <p style={{ color: 'var(--text-muted)' }}>Click on any notice to view full details.</p>
      </div>

      {loading ? (
        <p>Loading notices...</p>
      ) : notices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No notices have been posted yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {notices.map((notice) => (
            <div 
              key={notice.id} 
              className="card" 
              style={{ padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid transparent' }}
              onClick={() => {
                setSelectedNotice(notice);
                if (!notice.isRead) {
                  // Local fallback
                  const savedHidden = localStorage.getItem('cff_read_notices');
                  const localHiddenIds = savedHidden ? JSON.parse(savedHidden) : [];
                  if (!localHiddenIds.includes(notice.id)) {
                    localStorage.setItem('cff_read_notices', JSON.stringify([...localHiddenIds, notice.id]));
                  }

                  fetch('/api/notices/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ noticeId: notice.id })
                  }).then(() => {
                    setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, isRead: true } : n));
                  }).catch(console.error);
                }
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, background: '#fffbeb', color: '#d97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{notice.title}</h3>
                      {!notice.isRead && (
                        <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          New
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {notice.content}
                  </p>
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                    <User size={12} /> Posted by {notice.authorName}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Details Modal */}
      {selectedNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '2rem' }}>
            <button 
              onClick={() => setSelectedNotice(null)}
              style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={24} />
            </button>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                <Megaphone size={16} /> OFFICIAL NOTICE
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>{selectedNotice.title}</h2>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} /> Posted by: <strong>{selectedNotice.authorName}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={14} /> Date: {new Date(selectedNotice.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#374151', fontSize: '1.05rem' }}>
              {selectedNotice.content}
            </div>

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => setSelectedNotice(null)} style={{ padding: '0.6rem 2.5rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
