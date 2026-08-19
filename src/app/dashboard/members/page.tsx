'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Key, Eye, EyeOff, ShieldCheck, Info, User, Mail, Phone, Calendar, Search, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/utils';

const DEFAULT_PERMISSIONS = {
  overview: 'FULL',
  members: 'FULL',
  payments: 'FULL',
  investments: 'FULL',
  expenses: 'FULL',
  incomes: 'FULL',
  ledger: 'FULL',
  reports: 'FULL',
  notices: 'FULL',
  settings: 'NONE'
};

const MODULES = [
  { key: 'overview', label: 'Dashboard Overview' },
  { key: 'members', label: 'Member Directory' },
  { key: 'payments', label: 'Collection Registry (Payments)' },
  { key: 'investments', label: 'Investment Portfolio' },
  { key: 'expenses', label: 'Expense Registry' },
  { key: 'incomes', label: 'Other Incomes' },
  { key: 'ledger', label: 'Ledger (হিসাব খাতা)' },
  { key: 'reports', label: 'Financial Reports' },
  { key: 'notices', label: 'Notice Board' },
  { key: 'settings', label: 'System Settings & Backups' }
];

export default function MembersPage() {
  const { isAdmin, hasPermission } = useAuth();
  const canEditMembers = hasPermission('members', 'EDIT');
  const canDeleteMembers = hasPermission('members', 'FULL');
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [formData, setFormData] = useState<any>({
    memberNo: '',
    name: '',
    email: '',
    phone: '',
    role: 'MEMBER',
    status: 'ACTIVE',
    joinDate: '',
    permissions: { ...DEFAULT_PERMISSIONS }
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
    setShowPermissions(member?.role === 'MANAGER');
    if (member) {
      setEditingId(member.id);
      setFormData({
        memberNo: member.memberNo || '',
        name: member.name || '',
        email: member.email || '',
        phone: member.phone || '',
        role: member.role || 'MEMBER',
        status: member.status || 'ACTIVE',
        joinDate: member.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : '',
        permissions: member.permissions || { ...DEFAULT_PERMISSIONS }
      });
      if (member.bannedAt) {
        setBannedDate(new Date(member.bannedAt).toISOString().split('T')[0]);
      } else {
        setBannedDate(new Date().toISOString().split('T')[0]);
      }
    } else {
      setEditingId(null);
      setFormData({
        memberNo: '',
        name: '',
        email: '',
        phone: '',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinDate: new Date().toISOString().split('T')[0],
        permissions: { ...DEFAULT_PERMISSIONS }
      });
      setBannedDate(new Date().toISOString().split('T')[0]);
    }
    setShowModal(true);
  };

  const handlePermissionChange = (moduleKey: string, val: string) => {
    setFormData((prev: any) => ({
      ...prev,
      permissions: {
        ...(prev.permissions || DEFAULT_PERMISSIONS),
        [moduleKey]: val
      }
    }));
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    try {
      const url = editingId ? `/api/members/${editingId}` : '/api/members';
      const method = editingId ? 'PATCH' : 'POST';

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
      setError(err.message || "Email or Member No already exists, or there is a server error.");
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

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.memberNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>Member Directory</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage all registered federation members and their status.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search members..." 
              style={{ paddingLeft: '2.75rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {canEditMembers && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <Plus size={18} /> Add New Member
            </button>
          )}
        </div>
      </div>

      <div className="card desktop-only" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member No</th>
                <th>Basic Information</th>
                <th>Role & Status</th>
                <th>Joining Date</th>
                <th>Equity & Payments</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="skeleton" style={{ height: '70px' }}></td></tr>
                ))
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No members matching your search.</td></tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <span style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        padding: '0.375rem 0.75rem', 
                        borderRadius: '8px', 
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        border: '1px solid var(--border)'
                      }}>
                        {member.memberNo || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{member.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Mail size={12} /> {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <ShieldCheck size={12} /> {member.role}
                        </div>
                        <span className={`badge ${member.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ alignSelf: 'flex-start' }}>
                          {member.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {formatDate(member.joinDate)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {member.status === 'ACTIVE' ? (
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <ShieldCheck size={14} /> ৳{Math.round(member.netEquity || 0).toLocaleString()}
                            <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>(Equity)</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Settled / No Equity
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: '#22c55e' }}>●</span> P: ৳{(member.totalPaidFees || 0).toLocaleString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: '#ef4444' }}>●</span> F: ৳{(member.totalPaidFines || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {canEditMembers && (
                          <>
                            <button className="btn btn-outline" style={{ width: 36, height: 36, padding: 0 }} onClick={() => handleOpenModal(member)} title="Edit Member">
                              <Edit2 size={16} />
                            </button>
                            <button className="btn btn-outline" style={{ width: 36, height: 36, padding: 0, color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.2)' }} onClick={() => handleResetPassword(member)} title="Reset Password">
                              <Key size={16} />
                            </button>
                          </>
                        )}
                        {canDeleteMembers && (
                          <button className="btn" style={{ width: 36, height: 36, padding: 0, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDelete(member.id)} title="Delete Member">
                            <Trash2 size={16} />
                          </button>
                        )}
                        {!canEditMembers && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read Only</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-only" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="card skeleton" style={{ height: '220px', borderRadius: '16px' }}></div>
            ))
          ) : filteredMembers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              No members matching your search.
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div key={member.id} className="card" style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                border: '1px solid var(--border)',
                background: 'var(--card-bg, rgba(30, 41, 59, 0.5))'
              }}>
                {/* Header: Avatar & Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                        <Mail size={12} /> <span style={{ wordBreak: 'break-all' }}>{member.email}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{ 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    padding: '0.375rem 0.625rem', 
                    borderRadius: '8px', 
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: '1px solid var(--border)',
                    whiteSpace: 'nowrap'
                  }}>
                    {member.memberNo || '—'}
                  </span>
                </div>

                {/* Details Section */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem', 
                  padding: '1rem 0', 
                  borderTop: '1px solid var(--border)', 
                  borderBottom: '1px solid var(--border)' 
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Role & Status</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        <ShieldCheck size={12} /> {member.role}
                      </div>
                      <span className={`badge ${member.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                        {member.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Joining Date</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginTop: '0.125rem' }}>
                      {formatDate(member.joinDate)}
                    </div>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Equity & Payments</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {member.status === 'ACTIVE' ? (
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <ShieldCheck size={14} /> ৳{Math.round(member.netEquity || 0).toLocaleString()}
                          <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 400 }}>(Equity)</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Settled / No Equity
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginTop: '0.125rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: '#22c55e', fontSize: '0.6rem' }}>●</span> <span style={{ color: 'var(--text-muted)' }}>P:</span> <strong style={{ color: 'white' }}>৳{(member.totalPaidFees || 0).toLocaleString()}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: '#ef4444', fontSize: '0.6rem' }}>●</span> <span style={{ color: 'var(--text-muted)' }}>F:</span> <strong style={{ color: 'white' }}>৳{(member.totalPaidFines || 0).toLocaleString()}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {canEditMembers && (
                    <>
                      <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: 36, padding: '0 0.875rem', fontSize: '0.8125rem' }} onClick={() => handleOpenModal(member)} title="Edit Member">
                        <Edit2 size={14} /> Edit
                      </button>
                      <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: 36, padding: '0 0.875rem', fontSize: '0.8125rem', color: '#818cf8', borderColor: 'rgba(129, 140, 248, 0.2)' }} onClick={() => handleResetPassword(member)} title="Reset Password">
                        <Key size={14} /> Reset Key
                      </button>
                    </>
                  )}
                  {canDeleteMembers && (
                    <button className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', height: 36, padding: '0 0.875rem', fontSize: '0.8125rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDelete(member.id)} title="Delete Member">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  {!canEditMembers && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read Only</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modern Modal Implementation */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem'
        }} onClick={handleCloseModal}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--background)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingId ? 'Update Member' : 'Register Member'}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{editingId ? 'Modify existing member details.' : 'Add a new member to the federation database.'}</p>
              </div>
              <button onClick={handleCloseModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="reset-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label className="reset-label">Member Identification</label>
                  <input type="text" className="input" value={formData.memberNo} onChange={e => setFormData({...formData, memberNo: e.target.value})} placeholder="e.g. CFF-001" />
                </div>
                <div>
                  <label className="reset-label">Official Join Date</label>
                  <input type="date" className="input" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label className="reset-label">Legal Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input type="text" className="input" style={{ paddingLeft: '2.75rem' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="John Doe" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label className="reset-label">Email Contact</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                    <input type="email" className="input" style={{ paddingLeft: '2.75rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="reset-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                    <input type="text" className="input" style={{ paddingLeft: '2.75rem' }} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="01XXXXXXXXX" />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="reset-label">Account Role</label>
                  <select className="input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="MEMBER">Standard Member</option>
                    <option value="MANAGER">Authorized Manager</option>
                  </select>
                </div>
                <div>
                  <label className="reset-label">Member Status</label>
                  <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">Active Member</option>
                    <option value="BANNED">Terminated / Banned</option>
                  </select>
                </div>
              </div>

              {formData.role === 'MANAGER' && isAdmin && (
                <div style={{
                  border: '1px solid rgba(129, 140, 248, 0.2)',
                  background: 'rgba(129, 140, 248, 0.02)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginTop: '0.5rem'
                }}>
                  <div 
                    onClick={() => setShowPermissions(!showPermissions)} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 700 }}>
                      <ShieldCheck size={18} />
                      <span>Manager Permissions Configuration</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {showPermissions ? 'Collapse ▴' : 'Expand ▾'}
                    </span>
                  </div>

                  {showPermissions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Set granular access levels for each module.
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {MODULES.map(m => {
                          const currentVal = (formData.permissions && formData.permissions[m.key]) || (m.key === 'settings' ? 'NONE' : 'FULL');
                          return (
                            <div key={m.key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              background: 'rgba(255, 255, 255, 0.02)', 
                              padding: '0.5rem 0.75rem', 
                              borderRadius: '10px',
                              border: '1px solid var(--border)'
                            }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{m.label}</span>
                              <select 
                                className="input" 
                                style={{ width: '120px', padding: '0.25rem 0.5rem', height: '36px', fontSize: '0.85rem' }} 
                                value={currentVal}
                                onChange={e => handlePermissionChange(m.key, e.target.value)}
                              >
                                <option value="NONE">NONE</option>
                                <option value="VIEW">VIEW</option>
                                <option value="EDIT">EDIT</option>
                                <option value="FULL">FULL</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.status === 'BANNED' && (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '1.25rem' }}>
                  <label className="reset-label" style={{ color: '#ef4444' }}>Effective Termination Date</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={bannedDate} 
                    onChange={e => setBannedDate(e.target.value)} 
                    style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Settlement calculations will be processed up to this date.</p>
                </div>
              )}

              {settlement && (
                <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-light)', fontWeight: 700, marginBottom: '1rem' }}>
                    <Info size={18} /> Financial Settlement Analysis
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Membership Duration:</span>
                      <span style={{ fontWeight: 700 }}>{settlement.durationYears} Years</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Principal Paid:</span>
                      <span style={{ fontWeight: 700 }}>৳ {settlement.totalPrincipal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                      <span>Early Termination Fee:</span>
                      <span style={{ fontWeight: 700 }}>- ৳ {settlement.deduction.toLocaleString()}</span>
                    </div>
                    <div style={{ borderTop: '1px dashed var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem' }}>
                      <span style={{ fontWeight: 800 }}>Final Refund Amount:</span>
                      <span style={{ fontWeight: 900, color: 'var(--primary-light)' }}>৳ {settlement.finalRefund.toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                      Rule: {settlement.ruleText}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ minWidth: '140px' }}>
                  {submitLoading ? 'Processing...' : (editingId ? 'Update Record' : 'Create Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1.5rem' }} onClick={() => setShowResetModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 72, height: 72, background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Key size={36} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Reset Security</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Providing a new secure password for:<br/>
              <strong style={{ color: 'white' }}>{resetUserName}</strong>
            </p>

            <form onSubmit={submitReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              <div style={{ position: 'relative' }}>
                <label className="reset-label">New Secure Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    className="input" 
                    style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    placeholder="Min 6 characters"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowResetModal(false)} style={{ flex: 1 }}>Discard</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading} style={{ flex: 1.5 }}>
                  {submitLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
