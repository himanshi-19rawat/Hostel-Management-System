import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Contrast, Type, Table, Key, Building2, CheckCircle, AlertCircle, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HostelSettings } from '../types';

export const Settings: React.FC = () => {
  const { role } = useAuth();
  const {
    theme, setTheme,
    colorTheme, setColorTheme,
    highContrast, setHighContrast,
    fontSize, setFontSize,
    compactTables, setCompactTables,
  } = useTheme();

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hostel master settings (Admin only)
  const [hostelData, setHostelData] = useState<HostelSettings | null>(null);
  const [hostelMsg, setHostelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (role === 'admin') {
      api.getHostelSettings().then(setHostelData).catch(() => {});
    }
  }, [role]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      await api.changePassword(oldPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to update password' });
    }
  };

  const handleSaveHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelData) return;
    try {
      const updated = await api.updateHostelSettings(hostelData);
      setHostelData(updated);
      setHostelMsg({ type: 'success', text: 'Hostel configuration saved.' });
      setTimeout(() => setHostelMsg(null), 4000);
    } catch (err: any) {
      setHostelMsg({ type: 'error', text: err.message || 'Failed to update hostel settings' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Usability & System Settings</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Configure Q03 usability parameters, manage your password, and customize display accessibility.
        </p>
      </div>

      {/* 1. Usability & Accessibility Preferences (Q03) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <SettingsIcon size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Q03 Usability & Accessibility Controls</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {/* Theme Selection */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sun size={16} /> Color Theme
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`btn btn-sm ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                System
              </button>
            </div>
          </div>

          {/* Accent Color Palette */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={16} /> Accent Theme Palette
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setColorTheme('blue')}
                className={`btn btn-sm ${colorTheme === 'blue' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                Blue
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('emerald')}
                className={`btn btn-sm ${colorTheme === 'emerald' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }}></span>
                Emerald
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('violet')}
                className={`btn btn-sm ${colorTheme === 'violet' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>
                Violet
              </button>
              <button
                type="button"
                onClick={() => setColorTheme('slate')}
                className={`btn btn-sm ${colorTheme === 'slate' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#475569' }}></span>
                Slate
              </button>
            </div>
          </div>

          {/* High Contrast */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Contrast size={16} /> Contrast Mode (WCAG 2.1)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setHighContrast(false)}
                className={`btn btn-sm ${!highContrast ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setHighContrast(true)}
                className={`btn btn-sm ${highContrast ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                High Contrast
              </button>
            </div>
          </div>

          {/* Font Scaling */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={16} /> Text & Font Scaling
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFontSize('small')}
                className={`btn btn-sm ${fontSize === 'small' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Small (13.5px)
              </button>
              <button
                type="button"
                onClick={() => setFontSize('medium')}
                className={`btn btn-sm ${fontSize === 'medium' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Normal (15px)
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`btn btn-sm ${fontSize === 'large' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Large (17px)
              </button>
            </div>
          </div>

          {/* Compact View */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Table size={16} /> Table Row Density
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setCompactTables(false)}
                className={`btn btn-sm ${!compactTables ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setCompactTables(true)}
                className={`btn btn-sm ${compactTables ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
              >
                Compact (More Rows)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Password Security */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <Key size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Change Password</h3>
        </div>

        {passwordMsg && (
          <div
            style={{
              backgroundColor: passwordMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: passwordMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.875rem',
            }}
          >
            {passwordMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={5}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={5}
            />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
          </div>
        </form>
      </div>

      {/* 3. Hostel Settings (Administrator Only) */}
      {role === 'admin' && hostelData && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Hostel Master Configuration</h3>
          </div>

          {hostelMsg && (
            <div
              style={{
                backgroundColor: hostelMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: hostelMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.875rem',
              }}
            >
              {hostelMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{hostelMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveHostel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Hostel Official Name</label>
              <input
                type="text"
                className="form-input"
                value={hostelData.hostel_name}
                onChange={(e) => setHostelData({ ...hostelData, hostel_name: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Official Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={hostelData.contact_email || ''}
                  onChange={(e) => setHostelData({ ...hostelData, contact_email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Official Contact Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={hostelData.contact_phone || ''}
                  onChange={(e) => setHostelData({ ...hostelData, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Campus Address</label>
              <input
                type="text"
                className="form-input"
                value={hostelData.address || ''}
                onChange={(e) => setHostelData({ ...hostelData, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hostel Rules & Policy Handbook</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={hostelData.rules_policy || ''}
                onChange={(e) => setHostelData({ ...hostelData, rules_policy: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                Save Master Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
