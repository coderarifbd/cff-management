'use client';
import { useState, useEffect } from 'react';
import { Megaphone, Calendar } from 'lucide-react';

export default function MemberNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        setNotices(data || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Notice Board</h2>
        <p style={{ color: 'var(--text-muted)' }}>Stay updated with the latest cooperative federation announcements.</p>
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
            <div key={notice.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, background: '#fffbeb', color: '#d97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Megaphone size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{notice.title}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> {new Date(notice.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{notice.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
