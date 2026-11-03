import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FirstLoginModal: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user?.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from your initial temporary password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await api.firstLoginChangePassword(oldPassword, newPassword);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 100,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-lg)',
          padding: '32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            First Login: Password Change Required
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
            To safeguard institutional data and adhere to security guidelines, you must set a personalized password before accessing the system.
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Current Initial Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter initial password (e.g. 12345)"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Secure Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '8px', padding: '10px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Set New Password & Proceed'}
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '4px' }}
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};
