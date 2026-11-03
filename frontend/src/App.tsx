import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { FirstLoginModal } from './components/FirstLoginModal';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Rooms } from './pages/Rooms';
import { Fees } from './pages/Fees';
import { Notices } from './pages/Notices';
import { Calendar } from './pages/Calendar';
import { Issues } from './pages/Issues';
import { AdminUsers } from './pages/AdminUsers';
import { TqmFramework } from './pages/TqmFramework';
import { Settings } from './pages/Settings';
import { Attendance } from './pages/Attendance';
import { LeaveOutpass } from './pages/LeaveOutpass';
import { MessInventory } from './pages/MessInventory';
import { ActivityMap } from './pages/ActivityMap';
import { SecurityGate } from './pages/SecurityGate';

const getRequestedTabFromUrl = (): string => {
  if (typeof window === 'undefined') return '';
  // 1. Check hash e.g. #dashboard or #notices
  if (window.location.hash) {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash) return hash;
  }
  // 2. Check query param ?tab=...
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam) return tabParam.trim();

  // 3. Check pathname e.g. /notices or /dashboard
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
  if (path && path !== 'login') return path;

  return '';
};

const getDefaultTabForRole = (role?: string | null): string => {
  if (role === 'accounts_staff') return 'notices';
  return 'dashboard';
};

const isTabAllowedForRole = (tab: string, role?: string | null): boolean => {
  if (!role) return false;
  if (role === 'accounts_staff') {
    // Accounts staff has NO dashboard access; only notice board, calendar, usability settings
    return ['notices', 'calendar', 'settings'].includes(tab);
  }
  if (role === 'parent') {
    return ['dashboard', 'map', 'security_gate', 'notices', 'calendar', 'settings'].includes(tab);
  }
  if (role === 'staff') {
    return ['dashboard', 'map', 'security_gate', 'notices', 'calendar', 'settings'].includes(tab);
  }
  if (role === 'student') {
    return [
      'dashboard',
      'map',
      'security_gate',
      'student_profile',
      'student_dues',
      'attendance',
      'leave_outpass',
      'issues',
      'notices',
      'calendar',
      'settings',
    ].includes(tab);
  }
  if (role === 'warden') {
    return [
      'dashboard',
      'map',
      'security_gate',
      'students',
      'rooms',
      'fees',
      'attendance',
      'leave_outpass',
      'mess_inventory',
      'notices',
      'calendar',
      'issues',
      'settings',
    ].includes(tab);
  }
  if (role === 'admin') {
    return [
      'dashboard',
      'map',
      'security_gate',
      'students',
      'rooms',
      'fees',
      'attendance',
      'leave_outpass',
      'mess_inventory',
      'users',
      'notices',
      'calendar',
      'issues',
      'settings',
      'tqm',
    ].includes(tab);
  }
  return false;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [currentTab, setCurrentTabState] = useState<string>(() => {
    const req = getRequestedTabFromUrl();
    return req || 'dashboard';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Sync and enforce role-based route permissions on mount and role changes
  useEffect(() => {
    if (!isAuthenticated || !role) return;

    const enforceRoleRouting = () => {
      const requested = getRequestedTabFromUrl() || currentTab;
      if (isTabAllowedForRole(requested, role)) {
        setCurrentTabState(requested);
      } else {
        // Forbidden or invalid route for this role (e.g. Accounts Staff attempting to access dashboard directly)
        const fallback = getDefaultTabForRole(role);
        setCurrentTabState(fallback);
        if (window.location.hash !== `#${fallback}`) {
          window.history.replaceState(null, '', `#${fallback}`);
        }
      }
    };

    enforceRoleRouting();

    const handleUrlChange = () => {
      enforceRoleRouting();
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [isAuthenticated, role]);

  const handleNavigate = (targetTab: string) => {
    if (isTabAllowedForRole(targetTab, role)) {
      setCurrentTabState(targetTab);
      window.history.pushState(null, '', `#${targetTab}`);
    } else {
      const fallback = getDefaultTabForRole(role);
      setCurrentTabState(fallback);
      window.history.replaceState(null, '', `#${fallback}`);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-muted)',
        }}
      >
        Initializing Hostel Management System...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActivePage = () => {
    // If Accounts Staff somehow reaches dashboard tab directly, block and render Notices
    if (role === 'accounts_staff' && currentTab === 'dashboard') {
      return <Notices />;
    }

    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'map':
        return <ActivityMap />;
      case 'security_gate':
        return <SecurityGate />;
      case 'students':
      case 'student_profile':
        return <Students />;
      case 'rooms':
        return <Rooms />;
      case 'fees':
      case 'student_dues':
        return <Fees />;
      case 'notices':
        return <Notices />;
      case 'calendar':
        return <Calendar />;
      case 'issues':
        return <Issues />;
      case 'attendance':
        return <Attendance />;
      case 'leave_outpass':
        return <LeaveOutpass />;
      case 'mess_inventory':
        return <MessInventory />;
      case 'tqm':
        return <TqmFramework />;
      case 'users':
        return role === 'admin' ? <AdminUsers /> : <Dashboard onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings />;
      default:
        return role === 'accounts_staff' ? <Notices /> : <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-layout">
      {/* Forced First Login Password Change Modal */}
      <FirstLoginModal />

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="main-content">
        <Navbar currentTab={currentTab} />
        <main className="page-container">{renderActivePage()}</main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
