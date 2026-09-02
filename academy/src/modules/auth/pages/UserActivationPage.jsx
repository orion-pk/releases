import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { BrandConfig } from '../../../config/BrandConfig';
import { verifyInvitationApi, completeInvitationApi } from '../../../api';
import { useAuth } from '../../../context/AuthContext';

export const UserActivationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setVerifyError('Invitation activation token is missing from URL.');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyInvitationApi(token);
        if (res.valid) {
          setInvitationData(res);
        } else {
          setVerifyError(res.error || 'Invalid or expired invitation link.');
        }
      } catch (err) {
        const msg = err.response?.data?.error || err.message || 'Failed to verify invitation link.';
        setVerifyError(msg);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!password) {
      setSubmitError('Please enter a new password.');
      return;
    }
    if (password.length < 4) {
      setSubmitError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Password and Confirm Password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeInvitationApi(token, password);
      if (res.success && res.token && res.user) {
        setSuccessMessage('Account activated successfully! Logging you in...');
        login(res.user, res.token);

        setTimeout(() => {
          const roles = res.user.roles || [];
          if (roles.includes('Teacher')) navigate('/teacher');
          else if (roles.includes('Student')) navigate('/student');
          else if (roles.includes('Parent')) navigate('/parent');
          else navigate('/admin');
        }, 1200);
      } else {
        setSubmitError(res.error || res.message || 'Failed to activate account.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Activation failed.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BrandConfig.loginBg || '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: BrandConfig.fontFamily,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          padding: '2.25rem 2rem',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src={BrandConfig.brandLogo} alt="Academia" style={{ height: '48px', marginBottom: '0.75rem', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
            Account Activation
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Set up your custom password to access your Academia profile.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b', fontSize: '0.9rem' }}>
            Verifying secret invitation token...
          </div>
        ) : verifyError ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 500, width: '100%', boxSizing: 'border-box' }}>
              <AlertCircle size={20} color="#dc2626" style={{ marginBottom: '0.35rem' }} />
              <div>{verifyError}</div>
            </div>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                background: '#02658b',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Go to Login Page
            </button>
          </div>
        ) : (
          <div>
            {/* Account Details Summary Badge */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Account Information
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {invitationData?.username}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#02658b', fontWeight: 600 }}>
                Role: {invitationData?.roles?.join(', ') || 'User'}
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {submitError}
              </div>
            )}

            {/* Success Message */}
            {successMessage ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} />
                <span>{successMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* New Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    Create Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 2.5rem 0 0.85rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#02658b',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 6px rgba(2, 101, 139, 0.2)',
                  }}
                >
                  <span>{submitting ? 'Activating Account...' : 'Activate & Enter Platform'}</span>
                  {!submitting && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
