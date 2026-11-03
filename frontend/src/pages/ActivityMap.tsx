import React, { useEffect, useState } from 'react';
import {
  MapPin,
  LogIn,
  LogOut,
  Clock,
  User,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  AlertCircle,
  Building,
  CheckCircle,
  FileText,
  Eye,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentStatus, StudentActivityLog } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const ActivityMap: React.FC = () => {
  const { role, user } = useAuth();
  const [statuses, setStatuses] = useState<StudentStatus[]>([]);
  const [logs, setLogs] = useState<StudentActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentStatus | null>(null);

  // Modal for logging activity
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);
  const [logFormData, setLogFormData] = useState({
    student_id: 0,
    activity_type: 'check_in' as 'check_in' | 'check_out',
    location: 'Main Campus Gate',
    timestamp: new Date().toISOString().slice(0, 16),
    remarks: '',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [statusData, logData] = await Promise.all([
        api.getStudentsStatus(),
        api.getActivityLogs(undefined, undefined, 100),
      ]);
      setStatuses(statusData);
      setLogs(logData);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load activity and presence data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLogModal = (studentId?: number, initialType?: 'check_in' | 'check_out') => {
    const defaultStudentId = studentId || (statuses.length > 0 ? statuses[0].student_id : 0);
    setLogFormData({
      student_id: defaultStudentId,
      activity_type: initialType || 'check_in',
      location: 'Main Campus Gate',
      timestamp: new Date().toISOString().slice(0, 16),
      remarks: '',
    });
    setIsLogModalOpen(true);
  };

  const handleRecordActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logFormData.student_id) {
      showFeedback('error', 'Please select a student');
      return;
    }

    setSubmittingLog(true);
    try {
      await api.recordActivity({
        student_id: Number(logFormData.student_id),
        activity_type: logFormData.activity_type,
        location: logFormData.location,
        timestamp: logFormData.timestamp ? new Date(logFormData.timestamp).toISOString() : undefined,
        remarks: logFormData.remarks || undefined,
      });
      showFeedback('success', `Successfully logged student ${logFormData.activity_type === 'check_in' ? 'Check-In' : 'Check-Out'}`);
      setIsLogModalOpen(false);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to record activity log');
    } finally {
      setSubmittingLog(false);
    }
  };

  // Filtered students
  const filteredStudents = statuses.filter((st) => {
    const matchesSearch =
      st.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.registration_no && st.registration_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.roll_number && st.roll_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (st.room_number && st.room_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || st.current_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summaries
  const totalMonitored = statuses.length;
  const checkedInCount = statuses.filter((s) => s.current_status === 'checked_in').length;
  const checkedOutCount = statuses.filter((s) => s.current_status === 'checked_out').length;
  const onLeaveCount = statuses.filter((s) => s.current_status === 'on_leave').length;

  const canRecord = role === 'admin' || role === 'warden' || role === 'staff' || role === 'student';

  const getStatusBadge = (currentStatus: string) => {
    switch (currentStatus) {
      case 'checked_in':
        return (
          <span className="badge badge-success" style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block', marginRight: 4 }}></span>
            Checked In
          </span>
        );
      case 'checked_out':
        return (
          <span className="badge badge-warning" style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#d97706', display: 'inline-block', marginRight: 4 }}></span>
            Checked Out
          </span>
        );
      case 'on_leave':
        return (
          <span className="badge badge-purple" style={{ padding: '4px 10px', fontSize: '0.8125rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9333ea', display: 'inline-block', marginRight: 4 }}></span>
            On Approved Leave
          </span>
        );
      default:
        return <span className="badge">{currentStatus}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={28} style={{ color: 'var(--accent-primary)' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Campus Activity Map & Gate Presence
            </h1>
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {role === 'parent'
              ? 'Real-time campus presence status and check-in/out gate history for your linked student.'
              : 'Real-time campus gate presence, check-in / check-out history, and approved leave tracking.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="btn btn-secondary"
            title="Refresh status data"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {canRecord && (
            <button
              onClick={() => openLogModal()}
              className="btn btn-primary"
            >
              <LogIn size={16} />
              Record Gate Check-In / Out
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`card`}
          style={{
            padding: '12px 16px',
            backgroundColor: feedback.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
            <User size={24} />
          </div>
          <div>
            <div className="stat-val">{totalMonitored}</div>
            <div className="stat-lbl">{role === 'parent' ? 'Linked Student' : 'Total Students Monitored'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-val">{checkedInCount}</div>
            <div className="stat-lbl">Checked In (Campus & Hostels)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <LogOut size={24} />
          </div>
          <div>
            <div className="stat-val">{checkedOutCount}</div>
            <div className="stat-lbl">Checked Out (Departed Campus)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-val">{onLeaveCount}</div>
            <div className="stat-lbl">On Approved Leave / Outpass</div>
          </div>
        </div>
      </div>

      {/* Campus Map Visual Section */}
      <div className="card" style={{ padding: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Interactive Campus Layout & Checkpoints
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Physical campus zones, gate monitoring points, and current occupant distribution
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: '0.8125rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
              Checked In ({checkedInCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#d97706' }}></span>
              Checked Out ({checkedOutCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9333ea' }}></span>
              On Leave ({onLeaveCount})
            </span>
          </div>
        </div>

        {/* Campus Map Layout SVG Diagram & Zone Cards */}
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: 24,
            position: 'relative',
          }}
        >
          {/* Visual Campus Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {/* Zone 1: Main Security Checkpoint */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                border: '2px dashed var(--accent-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--accent-primary)' }}>
                  <Shield size={20} />
                  <span>Main Campus Gate</span>
                </div>
                <span className="badge badge-info">Security Checkpoint</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Primary ingress/egress terminal with logging. All check-ins and check-outs are recorded here.
              </p>
              <div style={{ fontSize: '0.8125rem', marginTop: 4, padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6 }}>
                🕒 <strong>Recent Activity:</strong> {logs.length > 0 ? `${logs[0].student_name} (${logs[0].activity_type})` : 'No recent logs'}
              </div>
            </div>

            {/* Zone 2: Residence Block A */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <Building size={20} style={{ color: '#16a34a' }} />
                  <span>Hostel Block A</span>
                </div>
                <span className="badge badge-success">Residence</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Student residential quarters & study rooms. Active occupants verified on campus.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {statuses
                  .filter((s) => s.current_status === 'checked_in')
                  .slice(0, 4)
                  .map((st) => (
                    <span
                      key={st.student_id}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--success-bg)',
                        color: 'var(--success)',
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      {st.student_name} {st.room_number ? `(${st.room_number})` : ''}
                    </span>
                  ))}
              </div>
            </div>

            {/* Zone 3: Dining & Recreation */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <Building size={20} style={{ color: '#2563eb' }} />
                  <span>Mess & Common Area</span>
                </div>
                <span className="badge badge-info">Campus Amenities</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Dining Hall, Recreation Hall, and Central Library accessible to checked-in students.
              </p>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Mess Meal Hours: 07:30 - 21:30
              </div>
            </div>

            {/* Zone 4: Departed / On Approved Leave */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                border: '1px solid #d8b4fe',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#9333ea' }}>
                  <Calendar size={20} />
                  <span>Off-Campus / Approved Leave</span>
                </div>
                <span className="badge badge-purple">{onLeaveCount + checkedOutCount} Off-Campus</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Students with sanctioned leave/outpass or logged departure from main gate.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {statuses
                  .filter((s) => s.current_status === 'on_leave' || s.current_status === 'checked_out')
                  .slice(0, 4)
                  .map((st) => (
                    <span
                      key={st.student_id}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        backgroundColor: st.current_status === 'on_leave' ? '#f3e8ff' : 'var(--warning-bg)',
                        color: st.current_status === 'on_leave' ? '#7e22ce' : 'var(--warning)',
                        borderRadius: 4,
                        fontWeight: 500,
                      }}
                    >
                      {st.student_name} ({st.current_status === 'on_leave' ? 'Leave' : 'Out'})
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Students Status Directory with Search and Filter */}
      <div className="card" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              {role === 'parent' ? 'Linked Student Presence Overview' : 'Student Campus Presence Status'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Clear indicators for Checked In, Checked Out, and Approved Leave with return details
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search student or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 34, height: 38, fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-select"
                style={{ height: 38, fontSize: '0.875rem', width: 170 }}
              >
                <option value="all">All Statuses ({totalMonitored})</option>
                <option value="checked_in">Checked In ({checkedInCount})</option>
                <option value="checked_out">Checked Out ({checkedOutCount})</option>
                <option value="on_leave">On Approved Leave ({onLeaveCount})</option>
              </select>
            </div>
          </div>
        </div>

        {/* Student Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading student presence records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={User}
            title="No students found"
            description={
              role === 'parent'
                ? 'No linked student records found. Please contact administration to link your student account.'
                : 'No student presence records match the selected filter criteria.'
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {filteredStudents.map((st) => (
              <div
                key={st.student_id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 18,
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {st.student_name}
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Reg/Roll: <strong>{st.registration_no || st.roll_number || 'N/A'}</strong> • Room: {st.room_number || 'Unassigned'}
                    </div>
                  </div>
                  <div>{getStatusBadge(st.current_status)}</div>
                </div>

                {/* Latest Checkpoint Activity */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: '0.8125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                    <Clock size={14} />
                    <span>
                      <strong>Latest Activity:</strong>{' '}
                      {st.latest_activity
                        ? `${st.latest_activity.activity_type.toUpperCase().replace('_', ' ')} on ${new Date(
                            st.latest_activity.timestamp
                          ).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'No gate logs recorded yet'}
                    </span>
                  </div>
                  {st.latest_activity?.location && (
                    <div style={{ color: 'var(--text-muted)', paddingLeft: 20 }}>
                      Checkpoint: {st.latest_activity.location}
                    </div>
                  )}
                  {st.latest_activity?.remarks && (
                    <div style={{ color: 'var(--text-muted)', paddingLeft: 20, fontStyle: 'italic' }}>
                      "{st.latest_activity.remarks}"
                    </div>
                  )}
                </div>

                {/* If On Leave: show leave details clearly */}
                {st.current_status === 'on_leave' && st.active_leave && (
                  <div
                    style={{
                      border: '1px solid #d8b4fe',
                      backgroundColor: '#faf5ff',
                      padding: 10,
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      color: '#581c87',
                    }}
                  >
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} /> Approved {st.active_leave.request_type.toUpperCase()} Details
                    </div>
                    <div>
                      <strong>Departure:</strong> {st.active_leave.start_date}
                    </div>
                    <div>
                      <strong>Expected Return:</strong> {st.active_leave.end_date}
                    </div>
                    <div>
                      <strong>Reason:</strong> {st.active_leave.reason}
                    </div>
                  </div>
                )}

                {/* Action buttons for authorized users */}
                {canRecord && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => openLogModal(st.student_id, 'check_in')}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, color: '#16a34a' }}
                    >
                      <LogIn size={14} /> Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => openLogModal(st.student_id, 'check_out')}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, color: '#d97706' }}
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(st)}
                      className="btn btn-secondary btn-sm"
                      title="View Student Full Activity History"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity History Logs Table */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Gate Check-In & Check-Out Audit Logs
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Complete chronological audit trail of gate entries, exits, checkpoints, and remarks
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No activity history"
            description="No check-in or check-out events recorded for the accessible scope."
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Action</th>
                  <th>Checkpoint / Location</th>
                  <th>Recorded By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {new Date(l.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.student_name}</td>
                    <td>{l.registration_no || l.roll_number || '—'}</td>
                    <td>
                      {l.activity_type === 'check_in' ? (
                        <span className="badge badge-success" style={{ gap: 4 }}>
                          <LogIn size={12} /> Check-In
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ gap: 4 }}>
                          <LogOut size={12} /> Check-Out
                        </span>
                      )}
                    </td>
                    <td>{l.location || 'Main Campus Gate'}</td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {l.recorded_by_name || l.recorder_name || 'System / Gate'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {l.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Gate Activity Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Record Gate Activity (Check-In / Out)"
      >
        <form onSubmit={handleRecordActivity} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Student</label>
            <select
              value={logFormData.student_id}
              onChange={(e) => setLogFormData({ ...logFormData, student_id: Number(e.target.value) })}
              className="form-select"
              required
              disabled={role === 'student'}
            >
              {statuses.map((st) => (
                <option key={st.student_id} value={st.student_id}>
                  {st.student_name} ({st.registration_no || st.roll_number || 'N/A'}) - Currently: {st.current_status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Gate Action</label>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="activity_type"
                  checked={logFormData.activity_type === 'check_in'}
                  onChange={() => setLogFormData({ ...logFormData, activity_type: 'check_in' })}
                />
                <span className="badge badge-success" style={{ padding: '6px 12px' }}>
                  <LogIn size={14} /> Campus Check-In (Entering)
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="activity_type"
                  checked={logFormData.activity_type === 'check_out'}
                  onChange={() => setLogFormData({ ...logFormData, activity_type: 'check_out' })}
                />
                <span className="badge badge-warning" style={{ padding: '6px 12px' }}>
                  <LogOut size={14} /> Campus Check-Out (Leaving)
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Checkpoint / Location</label>
            <input
              type="text"
              value={logFormData.location}
              onChange={(e) => setLogFormData({ ...logFormData, location: e.target.value })}
              className="form-input"
              placeholder="e.g. Main Campus Gate, Hostel Block Gate"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date & Time</label>
            <input
              type="datetime-local"
              value={logFormData.timestamp}
              onChange={(e) => setLogFormData({ ...logFormData, timestamp: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Remarks / Purpose (Optional)</label>
            <input
              type="text"
              value={logFormData.remarks}
              onChange={(e) => setLogFormData({ ...logFormData, remarks: e.target.value })}
              className="form-input"
              placeholder="e.g. Weekend market visit, Returning from library, Doctor appointment"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="btn btn-secondary"
              disabled={submittingLog}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingLog}
            >
              {submittingLog ? 'Recording...' : 'Submit Gate Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Details Inspection Modal */}
      {selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudent(null)}
          title={`Presence History: ${selectedStudent.student_name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedStudent.student_name}</h4>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Roll/Reg: {selectedStudent.registration_no || selectedStudent.roll_number || 'N/A'} • Room: {selectedStudent.room_number || 'Unallocated'}
                </div>
              </div>
              <div>{getStatusBadge(selectedStudent.current_status)}</div>
            </div>

            {selectedStudent.active_leave && (
              <div style={{ padding: 12, backgroundColor: '#f3e8ff', borderRadius: 8, color: '#581c87', fontSize: '0.875rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Approved Leave Record:</div>
                <div>Duration: {selectedStudent.active_leave.start_date} to {selectedStudent.active_leave.end_date}</div>
                <div>Reason: {selectedStudent.active_leave.reason}</div>
              </div>
            )}

            <div>
              <h5 style={{ margin: '8px 0', fontSize: '0.9375rem', fontWeight: 600 }}>Student's Gate History:</h5>
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                {logs.filter((l) => l.student_id === selectedStudent.student_id).length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No check-in or check-out history recorded.
                  </div>
                ) : (
                  <table className="data-table" style={{ fontSize: '0.8125rem' }}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs
                        .filter((l) => l.student_id === selectedStudent.student_id)
                        .map((l) => (
                          <tr key={l.id}>
                            <td>{new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>
                              <span className={`badge ${l.activity_type === 'check_in' ? 'badge-success' : 'badge-warning'}`}>
                                {l.activity_type}
                              </span>
                            </td>
                            <td>{l.location}</td>
                            <td>{l.remarks || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
