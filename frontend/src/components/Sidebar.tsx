import React from 'react';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  Receipt,
  Bell,
  Calendar,
  AlertCircle,
  Settings,
  ShieldCheck,
  Building2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  FileText,
  Package,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, role } = useAuth();

  const getNavItems = () => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'warden', 'student', 'parent', 'staff'] },
      { id: 'map', label: 'Campus Activity Map', icon: MapPin, roles: ['admin', 'warden', 'student', 'parent', 'staff'] },
    ];

    if (role === 'admin' || role === 'warden') {
      items.push({ id: 'students', label: 'Students', icon: Users, roles: ['admin', 'warden'] });
      items.push({ id: 'rooms', label: 'Rooms & Allocations', icon: BedDouble, roles: ['admin', 'warden'] });
    }

    // Attendance
    if (role === 'warden') {
      items.push({ id: 'attendance', label: 'Student Attendance', icon: CalendarCheck, roles: ['warden'] });
    } else if (role === 'admin') {
      items.push({ id: 'attendance', label: 'Attendance (Read-Only)', icon: CalendarCheck, roles: ['admin'] });
    } else if (role === 'student') {
      items.push({ id: 'attendance', label: 'My Attendance', icon: CalendarCheck, roles: ['student'] });
    }

    // Leave & Outpass Requests
    if (role === 'warden') {
      items.push({ id: 'leave_outpass', label: 'Leave & Outpasses', icon: FileText, roles: ['warden'] });
    } else if (role === 'admin') {
      items.push({ id: 'leave_outpass', label: 'Leave & Outpasses (Read-Only)', icon: FileText, roles: ['admin'] });
    } else if (role === 'student') {
      items.push({ id: 'leave_outpass', label: 'Leave & Outpass', icon: FileText, roles: ['student'] });
    }

    // Mess Inventory (Warden manages, Admin oversight)
    if (role === 'warden') {
      items.push({ id: 'mess_inventory', label: 'Mess Inventory', icon: Package, roles: ['warden'] });
    } else if (role === 'admin') {
      items.push({ id: 'mess_inventory', label: 'Mess Inventory (Read-Only)', icon: Package, roles: ['admin'] });
    }

    // Fees: Warden is the only role that creates/manages fee records & collections; Admin has read-only oversight
    if (role === 'warden') {
      items.push({ id: 'fees', label: 'Fees & Collections', icon: Receipt, roles: ['warden'] });
    } else if (role === 'admin') {
      items.push({ id: 'fees', label: 'Fee Status (Read-Only)', icon: Receipt, roles: ['admin'] });
    }

    // Notices and Calendar accessible to everyone
    items.push({ id: 'notices', label: 'Notice Board', icon: Bell, roles: ['admin', 'warden', 'accounts_staff', 'student', 'parent', 'staff'] });
    items.push({ id: 'calendar', label: 'Calendar & Reminders', icon: Calendar, roles: ['admin', 'warden', 'accounts_staff', 'student', 'parent', 'staff'] });

    // Issues
    if (role !== 'accounts_staff' && role !== 'parent' && role !== 'staff') {
      items.push({
        id: 'issues',
        label: role === 'student' ? 'My Requests / Issues' : 'Maintenance Requests',
        icon: AlertCircle,
        roles: ['admin', 'warden', 'student'],
      });
    }

    // Student specific profile & financial overview
    if (role === 'student') {
      items.push({ id: 'student_profile', label: 'My Profile', icon: Users, roles: ['student'] });
      items.push({ id: 'student_dues', label: 'My Dues & Fees', icon: Receipt, roles: ['student'] });
    }

    // Admin exclusive
    if (role === 'admin') {
      items.push({ id: 'users', label: 'User Administration', icon: ShieldCheck, roles: ['admin'] });
    }

    // TQM Framework hidden as per requirement 5

    // Usability & preferences
    items.push({ id: 'settings', label: 'Settings & Usability', icon: Settings, roles: ['admin', 'warden', 'accounts_staff', 'student', 'parent', 'staff'] });

    return items.filter((item) => !role || item.roles.includes(role));
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <Building2 size={20} />
          </div>
          {!isCollapsed && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Hostel Care</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>TQM Q03 Usability</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn btn-secondary btn-sm"
          style={{
            padding: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#94a3b8',
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!isCollapsed && user && (
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.8rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.full_name || user.email}
          </div>
          <div style={{ textTransform: 'capitalize', color: 'var(--accent-primary)' }}>
            {user.role.replace('_', ' ')}
          </div>
        </div>
      )}
    </aside>
  );
};
