'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resetStep, setResetStep] = useState<1|2|3>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [resetNewPw, setResetNewPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  
  // OTP States
  const [loginMode, setLoginMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [phoneNumber, setPhoneNumber] = useState('+880');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [timer, setTimer] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  const router = useRouter();

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const initRecaptcha = () => {
    if (!recaptchaVerifier.current && typeof window !== 'undefined') {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      initRecaptcha();
      const appVerifier = recaptchaVerifier.current;
      if (!appVerifier) throw new Error('Recaptcha not initialized');

      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setTimer(120); // 2 minutes
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!confirmationResult) throw new Error('No confirmation result found');
      await confirmationResult.confirm(otp);
      
      // If Firebase confirms, tell our backend to issue our JWT
      const res = await fetch('/api/auth/otp-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.role === 'ADMIN' || data.role === 'MANAGER') {
          router.push('/dashboard');
        } else {
          router.push('/member-panel');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'OTP verified but failed to create session');
      }
    } catch (err: any) {
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => { setShowModal(true); setResetStep(1); setResetEmail(''); setResetKey(''); setResetNewPw(''); setResetConfirmPw(''); setResetError(''); };
  const closeModal = () => { setShowModal(false); };

  const handleResetStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetError('');
    setResetStep(2);
  };

  const handleResetStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetNewPw !== resetConfirmPw) { setResetError('Passwords do not match.'); return; }
    if (resetNewPw.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, adminSecretKey: resetKey, newPassword: resetNewPw })
      });
      const data = await res.json();
      if (res.ok) { setResetStep(3); }
      else { setResetError(data.error || 'Reset failed. Please try again.'); }
    } catch { setResetError('Network error. Please try again.'); }
    finally { setResetLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.role === 'ADMIN' || data.role === 'MANAGER') {
          router.push('/dashboard');
        } else {
          router.push('/member-panel');
        }
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Forgot Password Modal (wizard) ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            {/* Step indicators */}
            {resetStep < 3 && (
              <div className="reset-steps">
                {[1,2].map(s => (
                  <div key={s} className={`reset-step-dot ${resetStep >= s ? 'active' : ''}`} />
                ))}
              </div>
            )}

            {/* ── Step 1: Enter email ── */}
            {resetStep === 1 && (
              <>
                <div className="modal-icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h3 className="modal-title">Admin Password Reset</h3>
                <p className="modal-body">Enter your admin email address to continue.</p>
                <form onSubmit={handleResetStep1} style={{textAlign:'left'}}>
                  <label className="reset-label">Admin Email</label>
                  <div className="reset-input-wrap">
                    <input
                      type="email" required autoFocus
                      className="reset-input"
                      placeholder="admin@example.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="modal-close-btn" style={{marginTop:'1.25rem'}}>Continue →</button>
                </form>
                <button className="modal-cancel-btn" onClick={closeModal}>Cancel</button>
              </>
            )}

            {/* ── Step 2: Secret key + new password ── */}
            {resetStep === 2 && (
              <>
                <div className="modal-icon-wrap">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h3 className="modal-title">Set New Password</h3>
                <p className="modal-body">Enter your admin secret key and choose a new password.</p>

                {resetError && (
                  <div className="reset-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleResetStep2} style={{textAlign:'left'}}>
                  <label className="reset-label">Admin Secret Key</label>
                  <div className="reset-input-wrap" style={{marginBottom:'0.85rem'}}>
                    <input
                      type="password" required autoFocus
                      className="reset-input"
                      placeholder="Enter secret key"
                      value={resetKey}
                      onChange={e => setResetKey(e.target.value)}
                    />
                  </div>

                  <label className="reset-label">New Password</label>
                  <div className="reset-input-wrap" style={{marginBottom:'0.85rem', position:'relative'}}>
                    <input
                      type={showResetPw ? 'text' : 'password'} required
                      className="reset-input"
                      placeholder="Min. 6 characters"
                      value={resetNewPw}
                      onChange={e => setResetNewPw(e.target.value)}
                      style={{paddingRight:'2.5rem'}}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowResetPw(p => !p)} style={{top:'50%',transform:'translateY(-50%)'}}>
                      {showResetPw
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>

                  <label className="reset-label">Confirm New Password</label>
                  <div className="reset-input-wrap">
                    <input
                      type="password" required
                      className="reset-input"
                      placeholder="Re-enter new password"
                      value={resetConfirmPw}
                      onChange={e => setResetConfirmPw(e.target.value)}
                    />
                  </div>

                  <div style={{display:'flex',gap:'0.6rem',marginTop:'1.25rem'}}>
                    <button type="button" className="modal-back-btn" onClick={() => { setResetStep(1); setResetError(''); }}>← Back</button>
                    <button type="submit" className="modal-close-btn" disabled={resetLoading} style={{flex:1}}>
                      {resetLoading
                        ? <><span className="spinner" style={{width:15,height:15}} /> Resetting…</>
                        : 'Reset Password'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ── Step 3: Success ── */}
            {resetStep === 3 && (
              <>
                <div className="modal-icon-wrap" style={{background:'linear-gradient(135deg,#15803d,#22c55e)'}}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="modal-title">Password Updated!</h3>
                <p className="modal-body">Your password has been reset successfully. You can now log in with your new password.</p>
                <button className="modal-close-btn" onClick={closeModal}>Back to Login</button>
              </>
            )}

          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        /* ── Modal ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: backdropFadeIn 0.2s ease both;
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .modal-box {
          width: 100%;
          max-width: 380px;
          background: rgba(18, 28, 20, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(74,222,128,0.2);
          border-radius: 20px;
          padding: 2rem 1.75rem;
          text-align: center;
          box-shadow: 0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: modalScaleIn 0.3s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-icon-wrap {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #15803d, #22c55e);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 0 0 8px rgba(21,128,61,0.15), 0 12px 28px rgba(21,128,61,0.35);
        }

        .modal-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }

        .modal-body {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }
        .modal-body strong { color: #4ade80; font-weight: 600; }

        .modal-close-btn {
          width: 100%;
          padding: 0.75rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: white;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.22s;
          box-shadow: 0 4px 16px rgba(21,128,61,0.4);
          letter-spacing: 0.01em;
        }
        .modal-close-btn:hover {
          background: linear-gradient(135deg, #166534, #15803d);
          box-shadow: 0 6px 24px rgba(21,128,61,0.55);
          transform: translateY(-1px);
        }
        .modal-close-btn:active { transform: translateY(0); }
        .modal-close-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Wizard Specific Styles */
        .reset-steps {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .reset-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: all 0.3s ease;
        }
        .reset-step-dot.active {
          background: #4ade80;
          box-shadow: 0 0 10px rgba(74,222,128,0.5);
          width: 20px;
          border-radius: 4px;
        }

        .reset-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .reset-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: white;
          outline: none;
          transition: all 0.2s;
        }
        .reset-input:focus {
          border-color: #4ade80;
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(74,222,128,0.1);
        }

        .reset-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #fca5a5;
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.8rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-back-btn {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: rgba(255,255,255,0.6);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .modal-back-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .modal-cancel-btn {
          display: block;
          width: 100%;
          margin-top: 1rem;
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          font-size: 0.8rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .modal-cancel-btn:hover { color: rgba(255,255,255,0.6); }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          background: #0a0f1e;
          position: relative;
          overflow: hidden;
        }

        /* ── Animated background blobs ── */
        .login-root::before,
        .login-root::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          animation: blobPulse 8s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .login-root::before {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #15803d, #064e3b);
          top: -150px; left: -150px;
        }
        .login-root::after {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #1d4ed8, #0c4a6e);
          bottom: -120px; right: -120px;
          animation-delay: 4s;
        }

        @keyframes blobPulse {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.15) translate(30px, 20px); }
        }

        /* ── Left brand panel ── */
        .login-brand {
          display: none;
          flex: 1;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 900px) { .login-brand { display: flex; } }

        .brand-logo-wrap {
          width: 88px; height: 88px;
          border-radius: 24px;
          background: linear-gradient(135deg, #15803d, #22c55e);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 2rem;
          box-shadow: 0 0 0 8px rgba(21,128,61,0.18), 0 20px 40px rgba(21,128,61,0.35);
          animation: logoPop 0.7s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes logoPop {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .brand-logo-wrap svg { color: white; }

        .brand-title {
          font-size: 2.1rem;
          font-weight: 800;
          color: #ffffff;
          text-align: center;
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.03em;
        }
        .brand-title span { color: #4ade80; }

        .brand-subtitle {
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          text-align: center;
          max-width: 320px;
          line-height: 1.7;
        }

        .brand-divider {
          width: 48px; height: 3px;
          background: linear-gradient(90deg, #15803d, #4ade80);
          border-radius: 99px;
          margin: 1.75rem auto;
        }

        .brand-stats {
          display: flex;
          gap: 2.5rem;
          margin-top: 2.5rem;
        }
        .brand-stat { text-align: center; }
        .brand-stat-num {
          font-size: 1.6rem;
          font-weight: 700;
          color: #4ade80;
        }
        .brand-stat-label {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.45);
          margin-top: 0.2rem;
        }

        /* ── Right form panel ── */
        .login-form-panel {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          position: relative;
          z-index: 2;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px;
          padding: 2.5rem 2rem;
          box-shadow: 0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: cardSlideUp 0.6s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Mobile logo (visible only on small screens) */
        .mobile-brand {
          text-align: center;
          margin-bottom: 2rem;
        }
        .mobile-brand-icon {
          width: 60px; height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #15803d, #22c55e);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.85rem;
          box-shadow: 0 8px 24px rgba(21,128,61,0.4);
        }
        @media (min-width: 900px) { .mobile-brand { display: none; } }

        .card-heading {
          font-size: 1.55rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.4rem;
          letter-spacing: -0.02em;
        }
        .card-subheading {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.45);
          margin-bottom: 2rem;
        }

        /* ── Error banner ── */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          margin-bottom: 1.25rem;
          font-size: 0.875rem;
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-5px); }
          40%,80%  { transform: translateX(5px); }
        }

        /* ── Form fields ── */
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          margin-bottom: 1.5rem;
        }

        .field-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          margin-bottom: 0.45rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .field-input-wrap {
          position: relative;
        }

        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
          display: flex;
        }

        .login-input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.75rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.25); }
        .login-input:focus {
          border-color: rgba(74,222,128,0.6);
          box-shadow: 0 0 0 3px rgba(21,128,61,0.25);
          background: rgba(255,255,255,0.09);
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.3);
          display: flex;
          padding: 4px;
          transition: color 0.2s;
        }
        .password-toggle:hover { color: rgba(255,255,255,0.7); }

        /* ── Submit button ── */
        .login-btn {
          width: 100%;
          padding: 0.85rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: white;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.25s;
          box-shadow: 0 4px 20px rgba(21,128,61,0.4);
          letter-spacing: 0.01em;
          margin-bottom: 1.25rem;
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #166534, #15803d);
          box-shadow: 0 6px 28px rgba(21,128,61,0.55);
          transform: translateY(-1px);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* spinner */
        .spinner {
          width: 17px; height: 17px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Forgot password ── */
        .forgot-link {
          display: block;
          text-align: center;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.38);
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          transition: color 0.2s;
        }
        .forgot-link:hover { color: #4ade80; }

        /* ── Footer ── */
        .login-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.25);
        }
      `}</style>

      <div className="login-root">
        {/* ── Left Brand Panel ── */}
        <div className="login-brand">
          <div className="brand-logo-wrap">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>

          <h1 className="brand-title">
            Chakalmua<br /><span>Friends Federation</span>
          </h1>
          <div className="brand-divider" />
          <p className="brand-subtitle">
            A trusted cooperative management platform serving our community with transparency and care.
          </p>

          <div className="brand-stats">
            <div className="brand-stat">
              <div className="brand-stat-num">CFF</div>
              <div className="brand-stat-label">Cooperative</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-num">100%</div>
              <div className="brand-stat-label">Secure</div>
            </div>
            <div className="brand-stat">
              <div className="brand-stat-num">24/7</div>
              <div className="brand-stat-label">Access</div>
            </div>
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="login-form-panel">
          <div className="login-card">

            {/* Mobile-only brand mark */}
            <div className="mobile-brand">
              <div className="mobile-brand-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Chakalmua Friends Federation</div>
            </div>

            <h2 className="card-heading">Welcome back 👋</h2>
            <p className="card-subheading">Sign in to your account to continue</p>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.25rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button 
                onClick={() => { setLoginMode('PASSWORD'); setError(''); }}
                style={{ 
                  flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: loginMode === 'PASSWORD' ? 'var(--primary)' : 'transparent',
                  color: loginMode === 'PASSWORD' ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s'
                }}
              >
                Password
              </button>
              <button 
                onClick={() => { setLoginMode('OTP'); setError(''); }}
                style={{ 
                  flex: 1, padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: loginMode === 'OTP' ? 'var(--primary)' : 'transparent',
                  color: loginMode === 'OTP' ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.2s'
                }}
              >
                OTP (Phone)
              </button>
            </div>

            {error && (
              <div className="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {loginMode === 'PASSWORD' ? (
              <form onSubmit={handleLogin}>
                <div className="field-group">
                  {/* Email */}
                  <div>
                    <label className="field-label" htmlFor="email">Email Address</label>
                    <div className="field-input-wrap">
                      <span className="field-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </span>
                      <input
                        id="email"
                        type="email"
                        className="login-input"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                {/* Password */}
                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <div className="field-input-wrap">
                    <span className="field-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button id="login-submit" type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className="forgot-link"
                onClick={() => setShowModal(true)}
              >
                Forgot your password?
              </button>
            </form>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP}>
                <div className="field-group">
                  {/* Phone Number */}
                  <div>
                    <label className="field-label" htmlFor="phone">Phone Number</label>
                    <div className="field-input-wrap">
                      <span className="field-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        className="login-input"
                        placeholder="+880 1XXX-XXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        disabled={otpSent}
                      />
                    </div>
                  </div>

                  {otpSent && (
                    <div style={{ animation: 'cardSlideUp 0.3s ease both' }}>
                      <label className="field-label" htmlFor="otp">Enter 6-Digit OTP</label>
                      <div className="field-input-wrap">
                        <span className="field-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </span>
                        <input
                          id="otp"
                          type="text"
                          className="login-input"
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          autoFocus
                          maxLength={6}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        {timer > 0 ? (
                          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            Wait {timer}s to resend
                          </p>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => { setOtpSent(false); setOtp(''); }}
                            style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div id="recaptcha-container" style={{ marginBottom: '1rem' }}></div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <><span className="spinner" /> {otpSent ? 'Verifying...' : 'Sending...'}</>
                  ) : (
                    <>
                      {otpSent ? 'Confirm & Login' : 'Send Login OTP'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>
                  )}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                  A verification code will be sent to your phone.
                </p>
              </form>
            )}

            <div className="login-footer">
              © {new Date().getFullYear()} Chakalmua Friends Federation · All rights reserved
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
