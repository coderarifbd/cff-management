'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Key, Eye, EyeOff, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function MembersPage() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    memberNo: '', name: '', email: '', phone: '', role: 'MEMBER', status: 'ACTIVE', joinDate: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [settlement, setSettlement] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [bannedDate, setBannedDate] = useState(new Date().toISOString().split('T')[0]);

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

  const calculateSettlement = async (memberId: string, date?: string) => {
    setCalcLoading(true);
    try {
      const url = date ? `/api/members/${memberId}/settlement?date=${date}` : `/api/members/${memberId}/settlement`;
      const res = await fetch(url);
      const data = await res.json();
      
      const years = parseFloat(data.durationYears);
      const principal = data.totalPrincipal;
      let deduction = 0;
      let profitShare = 100; // Default 100% (before deduction)
      let ruleText = "";

      if (years < 5) {
        deduction = principal * 0.4;
        profitShare = 0;
        ruleText = "Less than 5 years: 40% principal deduction, no profit.";
      } else if (years >= 5 && years < 7) {
        deduction = 0;
        profitShare = 0;
        ruleText = "5-7 years: Full principal return, no profit.";
      } else if (years >= 7 && years < 10) {
        deduction = 0;
        profitShare = 50;
        ruleText = "7-10 years: Full principal, 50% profit share.";
      } else {
        deduction = 0;
        profitShare = 80;
        ruleText = "More than 10 years: Full principal, 80% profit share.";
      }

      setSettlement({
        ...data,
        deduction,
        profitShare,
        ruleText,
        finalRefund: principal - deduction
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    if (formData.status === 'BANNED' && editingId) {
      calculateSettlement(editingId, bannedDate);
    } else {
      setSettlement(null);
    }
  }, [formData.status, editingId, bannedDate]);

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

      const payload: any = { ...formData };
      if (formData.status === 'BANNED' && settlement) {
        payload.refundAmount = settlement.finalRefund;
        payload.bannedDate = bannedDate;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      await fetchMembers();
      handleCloseModal();
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to update member. Please check console.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = async (member: any) => {
    setResetUserId(member.id);
    setResetUserName(`${member.name} (${member.memberNo || 'N/A'})`);
    setNewPassword('');
    setShowResetModal(true);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { alert('Password must be at least 6 characters'); return; }
    setSubmitLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetUserId, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert('Password reset successfully!');
      setShowResetModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitLoading(false);
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
                            <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: '#6366f1', borderColor: '#c7d2fe' }} onClick={() => handleResetPassword(member)} title="Reset Password">
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

              {formData.status === 'BANNED' && (
                <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#9a3412' }}>Effective Date for Settlement</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={bannedDate} 
                    onChange={e => setBannedDate(e.target.value)} 
                    style={{ borderColor: '#fed7aa' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#c2410c', marginTop: '0.4rem' }}>* Calculation will update based on this date.</p>
                </div>
              )}

              {settlement && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <Info size={16} /> Settlement Estimation
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Duration:</span>
                      <span style={{ fontWeight: 600 }}>{settlement.durationYears} Years</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Deposited:</span>
                      <span style={{ fontWeight: 600 }}>৳ {settlement.totalPrincipal}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                      <span>Deduction (Penalty):</span>
                      <span style={{ fontWeight: 600 }}>- ৳ {settlement.deduction}</span>
                    </div>
                    <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                      <span style={{ fontWeight: 700 }}>Final Refund:</span>
                      <span style={{ fontWeight: 800, color: 'var(--success)' }}>৳ {settlement.finalRefund}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      * {settlement.ruleText}
                    </p>
                  </div>
                </div>
              )}

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
      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 64, height: 64, background: '#e0e7ff', color: '#4338ca', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Key size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reset Password</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Set a new secure password for:<br/>
                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{resetUserName}</strong>
              </p>
            </div>

            <form onSubmit={submitReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>New Password</label>
                <input 
                  type={showPass ? 'text' : 'password'} 
                  className="input" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  required 
                  placeholder="Min 6 characters"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '0.75rem', top: '2.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowResetModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ flex: 1.5 }}>
                  {submitLoading ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
