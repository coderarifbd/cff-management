'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Key } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function MembersPage() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    memberNo: '', name: '', email: '', phone: '', role: 'MEMBER', status: 'ACTIVE', joinDate: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      if (Array.isArray(data)) setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenModal = (member?: any) => {
    setError('');
    if (member) {
      setEditingId(member.id);
      setFormData({
        memberNo: member.memberNo || '',
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'MEMBER',
        status: member.status || 'ACTIVE',
        joinDate: member.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : ''
      });
    } else {
      setEditingId(null);
      setFormData({
        memberNo: '', name: '', email: '', phone: '', role: 'MEMBER', status: 'ACTIVE', joinDate: new Date().toISOString().split('T')[0]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const url = editingId ? `/api/members/${editingId}` : '/api/members';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      await fetchMembers();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt('Enter new password for this member (min 6 characters):');
    if (!newPass) return;
    if (newPass.length < 6) { alert('Password too short'); return; }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, newPassword: newPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert('Password reset successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      await fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete member');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Member Directory</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add New Member
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Member No</th>
                <th>Name</th>
                <th>Contact Info</th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading members...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center' }}>No members found.</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id}>
                    <td style={{ fontWeight: 600 }}>{member.memberNo || '-'}</td>
                    <td>{member.name}</td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{member.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.phone || '-'}</div>
                    </td>
                    <td>{new Date(member.joinDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${member.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {member.status === 'BANNED' ? 'BANNED' : member.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isAdmin && (
                          <>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleOpenModal(member)} title="Edit Member">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: '#6366f1', borderColor: '#c7d2fe' }} onClick={() => handleResetPassword(member.id)} title="Reset Password">
                              <Key size={14} />
                            </button>
                            <button className="btn" style={{ padding: '0.25rem 0.5rem', background: '#fee2e2', color: '#991b1b' }} onClick={() => handleDelete(member.id)} title="Delete Member">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {!isAdmin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View only</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{editingId ? 'Edit Member' : 'Add New Member'}</h3>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            {error && <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Member No</label>
                  <input type="text" className="input" value={formData.memberNo} onChange={e => setFormData({...formData, memberNo: e.target.value})} placeholder="e.g. CFF-001" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Join Date</label>
                  <input type="date" className="input" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Full Name *</label>
                <input type="text" className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="John Doe" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Email Address *</label>
                <input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="john@example.com" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Phone Number</label>
                <input type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXXXXXXXX" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Role</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
                  <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">Active</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
