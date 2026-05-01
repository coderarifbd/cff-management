'use client';
import { useState } from 'react';
import { Download, Upload, ShieldAlert, Database, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreStep, setRestoreStep] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // Direct window location for GET download with server headers
      window.location.href = '/api/admin/backup';
      setMessage({ type: 'success', text: 'Backup generation started!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to generate backup. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowConfirmModal(true);
    e.target.value = ''; // Reset input
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setShowConfirmModal(false);
    
    setRestoreLoading(true);
    setMessage(null);
    setRestoreStep('Reading backup file...');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setRestoreStep('Analyzing data structure...');
          const content = event.target?.result;
          const backupData = JSON.parse(content as string);

          setRestoreStep('Restoring database (Please do not close this window)...');
          const res = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupData),
          });

          const result = await res.json();
          if (res.ok) {
            setRestoreStep('Success! Finalizing changes...');
            setMessage({ type: 'success', text: 'Database restored successfully! The page will reload in 3 seconds.' });
            setTimeout(() => window.location.reload(), 3000);
          } else {
            throw new Error(result.error || 'Restore failed');
          }
        } catch (err: any) {
          setMessage({ type: 'error', text: err.message || 'Invalid backup file format' });
          setRestoreLoading(false);
          setRestoreStep('');
        }
      };
      reader.readAsText(pendingFile);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to read file' });
      setRestoreLoading(false);
      setRestoreStep('');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
          <div className="modal-box" style={{ maxWidth: '440px', background: 'rgba(15, 23, 42, 0.95)', padding: '2.5rem', borderRadius: '28px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ width: '70px', height: '70px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <ShieldAlert size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Dangerous Action!</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              This will <strong style={{ color: '#ef4444' }}>PERMANENTLY OVERWRITE</strong> all current data. You will lose everything not in the backup file.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => { setShowConfirmModal(false); setPendingFile(null); }}
                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #991b1b)', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 16px rgba(239, 68, 68, 0.2)' }}
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Progress Modal */}
      {restoreLoading && (
        <div className="modal-backdrop" style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="modal-box" style={{ maxWidth: '400px', background: '#0f172a', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Database size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>System Restoring</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              We are carefully rebuilding your database. This may take a few moments.
            </p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 500 }}>{restoreStep}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>System Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your federation database backups and system preferences.</p>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        
        {/* Backup Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.75rem', borderRadius: '12px' }}>
              <Database size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Database Backup</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Download a full copy of your data for safety.</p>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <FileJson size={20} style={{ color: '#94a3b8', marginTop: '0.25rem' }} />
              <div>
                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>CFF Data Export</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The backup includes all members, payments, investments, expenses, and system notices. 
                  Keep this file in a secure place.
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleExport}
            disabled={loading}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              padding: '1.1rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 20px -5px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {loading ? <span className="spinner" /> : <Download size={22} />}
            {loading ? 'Generating Backup...' : 'Download Full Backup (.json)'}
          </button>
        </div>

        {/* Restore Card */}
        <div className="card" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '12px' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>System Restore</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Restore your database from a previous backup file.</p>
            </div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5 }}>
              <strong>Caution:</strong> Restoring will replace all current data. 
              Make sure you have a current backup before performing this action.
            </p>
          </div>

          <label 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.75rem', 
              padding: '1.1rem', 
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: restoreLoading ? 'not-allowed' : 'pointer', 
              opacity: restoreLoading ? 0.6 : 1,
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => { if(!restoreLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseOut={(e) => { if(!restoreLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            {restoreLoading ? <span className="spinner" /> : <Upload size={22} />}
            {restoreLoading ? 'Restoring Data...' : 'Upload & Restore Database'}
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
              disabled={restoreLoading}
            />
          </label>
        </div>

        {message && (
          <div style={{ 
            padding: '1.25rem', 
            borderRadius: '12px', 
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: message.type === 'success' ? '#4ade80' : '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{message.text}</span>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
