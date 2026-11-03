import React from 'react';
import { Sun, Moon, Contrast, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentTab: string;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Role Dashboard & Overview',
  map: 'Campus Activity Map & Gate Presence',
  students: 'Student Directory & Records',
  rooms: 'Room Inventory & Bed Allocations',
  fees: 'Fee Register & Payments',
  notices: 'Notice Board & Official Announcements',
  calendar: 'Hostel Calendar & Reminders',
  issues: 'Maintenance Requests & Complaints',
  student_profile: 'My Student Profile',
  student_dues: 'My Fee Invoices & Payment History',
  users: 'Account & Role Administration',
  attendance: 'Student Attendance Register',
  leave_outpass: 'Student Leave & Outpass Requests',
  mess_inventory: 'Mess Stock & Kitchen Inventory',
  tqm: 'TQM Quality Framework (Q03: Improve Usability)',
  settings: 'Usability Preferences & Settings',
};

export const Navbar: React.FC<NavbarProps> = ({ currentTab }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, highContrast, setHighContrast } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'badge-danger';
      case 'warden':
        return 'badge-warning';
      case 'parent':
        return 'badge-purple';
      case 'staff':
      case 'accounts_staff':
        return 'badge-info';
      case 'student':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {TAB_TITLES[currentTab] || 'Hostel Management'}
        </h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Accessibility Toggles */}
        <button
          onClick={() => setHighContrast(!highContrast)}
          className="btn btn-secondary btn-sm"
          title={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
          aria-label="High contrast mode"
          style={{ padding: '6px 10px' }}
        >
          <Contrast size={16} />
          <span style={{ fontSize: '0.78rem' }}>{highContrast ? 'Contrast: ON' : 'Contrast'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="btn btn-secondary btn-sm"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle color theme"
          style={{ padding: '6px 10px' }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span style={{ fontSize: '0.78rem' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* User Role Badge & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '6px' }}>
            <span className={`badge ${getRoleBadgeClass(user.role)}`}>
              {user.role.replace('_', ' ')}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
              <UserIcon size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name || user.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary btn-sm"
              title="Sign out securely"
              style={{ color: 'var(--danger)', marginLeft: '4px' }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
