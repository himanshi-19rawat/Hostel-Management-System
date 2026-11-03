import React, { useEffect, useState } from 'react';
import {
  Users,
  BedDouble,
  Receipt,
  AlertCircle,
  Bell,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Home,
  Info,
  CalendarCheck,
  FileText,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OperationalSummary, StudentProfile, RoomAllocation, FeeRecord, RequestStats, AttendanceSummary, StudentStatus, StudentActivityLog, StudentRequest } from '../types';
import { MapPin, LogIn, LogOut, CheckCircle, Shield } from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const [summary, setSummary] = useState<OperationalSummary | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [studentAllocs, setStudentAllocs] = useState<RoomAllocation[]>([]);
  const [studentFees, setStudentFees] = useState<FeeRecord[]>([]);
  const [requestStats, setRequestStats] = useState<RequestStats | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [parentStudents, setParentStudents] = useState<StudentStatus[]>([]);
  const [parentLogs, setParentLogs] = useState<StudentActivityLog[]>([]);
  const [parentRequests, setParentRequests] = useState<StudentRequest[]>([]);
  const [staffStatusList, setStaffStatusList] = useState<StudentStatus[]>([]);
  const [staffRecentLogs, setStaffRecentLogs] = useState<StudentActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (role !== 'parent' && role !== 'accounts_staff') {
          const sum = await api.getOperationalSummary().catch(() => null);
          if (sum) setSummary(sum);
        }

        if (role === 'student') {
          const [profile, allocs, fees, reqs, att] = await Promise.all([
            api.getMyStudentProfile(),
            api.getAllocations(),
            api.getFees(),
            api.getRequestStats(),
            api.getAttendanceSummary(),
          ]);
          setStudentProfile(profile);
          setStudentAllocs(allocs);
          setStudentFees(fees);
          setRequestStats(reqs);
          setAttendanceSummary(att);
        } else if (role === 'warden' || role === 'admin') {
          const reqs = await api.getRequestStats().catch(() => null);
          if (reqs) setRequestStats(reqs);
        } else if (role === 'parent') {
          const [statusList, logsList, reqList] = await Promise.all([
            api.getStudentsStatus().catch(() => []),
            api.getActivityLogs(undefined, undefined, 10).catch(() => []),
            api.getRequests().catch(() => []),
          ]);
          setParentStudents(statusList);
          setParentLogs(logsList);
          setParentRequests(reqList);
        } else if (role === 'staff') {
          const [statusList, logsList] = await Promise.all([
            api.getStudentsStatus().catch(() => []),
            api.getActivityLogs(undefined, undefined, 10).catch(() => []),
          ]);
          setStaffStatusList(statusList);
          setStaffRecentLogs(logsList);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [role]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <Clock size={20} className="animate-spin" />
          <span>Loading operational data from MySQL...</span>
        </div>
      </div>
    );
  }

  // --- Accounts Staff has no Dashboard ---
  if (role === 'accounts_staff') {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '8px' }}>
          Access Restricted
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Accounts Staff do not have access to an operational dashboard console.
        </p>
      </div>
    );
  }

  // --- Student Dashboard View ---
  if (role === 'student') {
    const activeAlloc = studentAllocs.find((a) => a.status === 'active');
    const myPendingDues = studentFees
      .filter((f) => f.status === 'pending' || f.status === 'partial' || f.status === 'overdue')
      .reduce((acc, curr) => acc + (Number(curr.amount_due) - Number(curr.amount_paid)), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Banner */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(22,163,74,0.1) 100%)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Welcome, {studentProfile?.full_name || user?.email}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
            Student Resident Portal — View your room allocation, fee status, and submit service requests.
          </p>
        </div>

        {/* Student Primary Status Cards */}
        <div className="stat-grid">
          {/* Room Allocation Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Room Allocation
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--info-bg)',
                  color: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BedDouble size={20} />
              </div>
            </div>
            {activeAlloc ? (
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeAlloc.block} — Room {activeAlloc.room_number}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Allocated since: {activeAlloc.allocated_from}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--warning)' }}>
                  Not Yet Assigned
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  The warden has not allocated a room yet.
                </div>
              </div>
            )}
          </div>

          {/* Fee Balance Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Outstanding Dues
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: myPendingDues > 0 ? 'var(--danger-bg)' : 'var(--success-bg)',
                  color: myPendingDues > 0 ? 'var(--danger)' : 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Receipt size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ₹{myPendingDues.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {myPendingDues === 0 ? 'All fees settled cleanly' : 'Pending payment to accounts office'}
              </div>
            </div>
          </div>

          {/* Leave & Outpass Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Leave & Outpass
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(147, 51, 234, 0.12)',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {requestStats ? `${requestStats.pending} Pending` : '0 Pending'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {requestStats ? `${requestStats.approved} approved, ${requestStats.rejected} rejected` : 'No requests yet'}
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Attendance Rate
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarCheck size={20} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {attendanceSummary?.attendance_percentage ?? 0}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {attendanceSummary ? `${attendanceSummary.present_count} / ${attendanceSummary.total_days} days present` : 'No attendance recorded'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions for Student */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>
            Quick Actions & Modules
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <button onClick={() => onNavigate('leave_outpass')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Apply for Leave / Outpass</span>
              <FileText size={16} />
            </button>
            <button onClick={() => onNavigate('attendance')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>View Attendance History</span>
              <CalendarCheck size={16} />
            </button>
            <button onClick={() => onNavigate('student_dues')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>View Fee Statements</span>
              <Receipt size={16} />
            </button>
            <button onClick={() => onNavigate('issues')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Report Issue / Maintenance</span>
              <AlertCircle size={16} />
            </button>
            <button onClick={() => onNavigate('student_profile')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Update Contact Details</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onNavigate('notices')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Check Notice Board</span>
              <Bell size={16} />
            </button>
            <button onClick={() => onNavigate('map')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Campus Activity Map</span>
              <MapPin size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Parent Dashboard View ---
  if (role === 'parent') {
    const student = parentStudents.length > 0 ? parentStudents[0] : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Banner */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Parent Portal — Ward Monitoring
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                Welcome, {user?.full_name || user?.email}! Real-time tracking of your student's campus presence, gate activity, and leave status.
              </p>
            </div>
            <button onClick={() => onNavigate('map')} className="btn btn-primary">
              <MapPin size={16} /> Campus Activity Map
            </button>
          </div>
        </div>

        {!student ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: 'var(--warning)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Student Profile Linked</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '8px auto 0' }}>
              Your parent account is currently not linked to any registered student. Please contact the hostel warden or administration to link your ward's student record.
            </p>
          </div>
        ) : (
          <>
            {/* Linked Student Card & Current Presence Status */}
            <div className="stat-grid">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Linked Student</span>
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>{student.student_name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Reg/Roll: {student.registration_no || student.roll_number || 'N/A'} • Room: {student.room_number || 'Unallocated'}</div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Current Campus Presence</span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      backgroundColor: student.current_status === 'checked_in' ? 'var(--success-bg)' : student.current_status === 'on_leave' ? '#f3e8ff' : 'var(--warning-bg)',
                      color: student.current_status === 'checked_in' ? 'var(--success)' : student.current_status === 'on_leave' ? '#9333ea' : 'var(--warning)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {student.current_status === 'checked_in' ? <CheckCircle size={18} /> : student.current_status === 'on_leave' ? <Calendar size={18} /> : <LogOut size={18} />}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: student.current_status === 'checked_in' ? 'var(--success)' : student.current_status === 'on_leave' ? '#9333ea' : 'var(--warning)',
                    }}
                  >
                    {student.current_status === 'checked_in' ? 'Checked In' : student.current_status === 'on_leave' ? 'On Approved Leave' : 'Checked Out'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {student.latest_activity
                      ? `Last movement: ${student.latest_activity.activity_type.toUpperCase()} at ${student.latest_activity.location || 'Main Gate'}`
                      : 'No gate movements logged yet'}
                  </div>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Sanctioned Leave Status</span>
                  <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} />
                  </div>
                </div>
                <div>
                  {student.active_leave ? (
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7e22ce' }}>Active Approved Leave</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Return: <strong>{student.active_leave.end_date}</strong>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Active Leave</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Student is currently on regular schedule</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Approved Leave Banner if active */}
            {student.active_leave && (
              <div className="card" style={{ borderLeft: '4px solid #9333ea', backgroundColor: '#faf5ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b21a8', fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>
                  <Info size={18} /> Active Sanctioned Leave / Outpass Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.875rem', color: '#581c87' }}>
                  <div><strong>Type:</strong> {student.active_leave.request_type.toUpperCase()}</div>
                  <div><strong>Departure Date:</strong> {student.active_leave.start_date}</div>
                  <div><strong>Expected Return:</strong> {student.active_leave.end_date}</div>
                  <div><strong>Reason / Destination:</strong> {student.active_leave.reason}</div>
                </div>
              </div>
            )}

            {/* Recent Check-In / Check-Out Activity */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Gate Movement History</h3>
                <button onClick={() => onNavigate('map')} className="btn btn-secondary btn-sm">
                  View Full Map & History <ArrowRight size={14} />
                </button>
              </div>

              {parentLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No gate check-in or check-out movements recorded yet.</p>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Action</th>
                        <th>Checkpoint</th>
                        <th>Recorded By</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentLogs.slice(0, 5).map((l) => (
                        <tr key={l.id}>
                          <td>{new Date(l.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${l.activity_type === 'check_in' ? 'badge-success' : 'badge-warning'}`}>
                              {l.activity_type === 'check_in' ? 'Check-In' : 'Check-Out'}
                            </span>
                          </td>
                          <td>{l.location || 'Main Gate'}</td>
                          <td>{l.recorded_by_name || l.recorder_name || 'Staff / Security'}</td>
                          <td>{l.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Leave / Outpass Requests History */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Leave & Outpass Applications</h3>
              {parentRequests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leave or outpass requests on record.</p>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Period</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Decision Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentRequests.slice(0, 5).map((req) => (
                        <tr key={req.id}>
                          <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{req.request_type}</td>
                          <td>{req.start_date} to {req.end_date}</td>
                          <td>{req.reason}</td>
                          <td>
                            <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>{req.decision_remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Quick Nav for Parents */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Parent Resources</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <button onClick={() => onNavigate('map')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Campus Activity Map</span>
              <MapPin size={16} />
            </button>
            <button onClick={() => onNavigate('notices')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Official Notices</span>
              <Bell size={16} />
            </button>
            <button onClick={() => onNavigate('calendar')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Hostel Calendar</span>
              <Calendar size={16} />
            </button>
            <button onClick={() => onNavigate('settings')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Account Settings</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Staff Operations Console ---
  if (role === 'staff') {
    const totalStudents = staffStatusList.length;
    const checkedIn = staffStatusList.filter((s) => s.current_status === 'checked_in').length;
    const checkedOut = staffStatusList.filter((s) => s.current_status === 'checked_out').length;
    const onLeave = staffStatusList.filter((s) => s.current_status === 'on_leave').length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Welcome Banner */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Staff Operations Console
                </h2>
                <span className="badge badge-info">Gate & Campus Duties</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.9rem' }}>
                Welcome, {user?.full_name || user?.email}! Monitor campus presence, record gate entries / exits, and view operational notices.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onNavigate('map')} className="btn btn-primary">
                <MapPin size={16} /> Campus Activity Map
              </button>
            </div>
          </div>
        </div>

        {/* Staff Duty KPI Cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
              <Users size={24} />
            </div>
            <div>
              <div className="stat-val">{totalStudents}</div>
              <div className="stat-lbl">Total Students Monitored</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="stat-val">{checkedIn}</div>
              <div className="stat-lbl">Checked In (Campus)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <LogOut size={24} />
            </div>
            <div>
              <div className="stat-val">{checkedOut}</div>
              <div className="stat-lbl">Checked Out (Departed)</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div className="stat-val">{onLeave}</div>
              <div className="stat-lbl">On Approved Leave</div>
            </div>
          </div>
        </div>

        {/* Gate Duty & Quick Actions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent Gate Movements</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Latest student check-in and check-out records captured at security gates.
              </p>
            </div>
            <button onClick={() => onNavigate('map')} className="btn btn-secondary btn-sm">
              Open Gate Monitor & Map <ArrowRight size={14} />
            </button>
          </div>

          {staffRecentLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent gate movements recorded today.</p>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Movement</th>
                    <th>Checkpoint</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRecentLogs.slice(0, 6).map((l) => (
                    <tr key={l.id}>
                      <td>{new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(l.timestamp).toLocaleDateString()})</td>
                      <td style={{ fontWeight: 600 }}>{l.student_name}</td>
                      <td>{l.registration_no || l.roll_number || '—'}</td>
                      <td>
                        <span className={`badge ${l.activity_type === 'check_in' ? 'badge-success' : 'badge-warning'}`}>
                          {l.activity_type === 'check_in' ? 'Check-In' : 'Check-Out'}
                        </span>
                      </td>
                      <td>{l.location || 'Main Gate'}</td>
                      <td>{l.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Quick Operations */}
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>Authorized Staff Operations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <button onClick={() => onNavigate('map')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Campus Activity Map & Gate Logging</span>
              <MapPin size={16} />
            </button>
            <button onClick={() => onNavigate('notices')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Staff Notice Board</span>
              <Bell size={16} />
            </button>
            <button onClick={() => onNavigate('calendar')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>Hostel Calendar</span>
              <Calendar size={16} />
            </button>
            <button onClick={() => onNavigate('settings')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
              <span>My Profile & Preferences</span>
              <ArrowRight size={16} />
            </button>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', backgroundColor: 'var(--bg-subtle)', borderRadius: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            🔒 <strong>Staff Access Scope:</strong> Authorized for gate logging, presence monitoring, notices, and calendar. Restricted from modifying fees, room allocations, student registrations, and attendance registers.
          </div>
        </div>
      </div>
    );
  }

  // --- Management Dashboard (Admin, Warden) ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Role Banner */}
      <div
        className="card"
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              {role === 'admin' && 'Administrator Control Center'}
              {role === 'warden' && 'Hostel Warden Operations Dashboard'}
            </h2>
            <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
              {role?.replace('_', ' ')}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            {role === 'admin' && 'Full administrative oversight: Manage accounts, hostel parameters, room assets, and financial status.'}
            {role === 'warden' && 'Supervise student residents, room allocations, fee register & collections, official announcements, and maintenance tickets.'}
          </p>
        </div>
      </div>

      {/* Real Operational Metrics (Zero Mock Data) */}
      <div className="stat-grid">
        {/* Total Students */}
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-val">{summary?.total_students ?? 0}</div>
            <div className="stat-lbl">Registered Students</div>
          </div>
        </div>

        {/* Room & Occupancy Stats (Admin & Warden) */}
        {(role === 'admin' || role === 'warden') && (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                <BedDouble size={24} />
              </div>
              <div>
                <div className="stat-val">
                  {summary?.occupied_beds ?? 0} / {summary?.total_capacity ?? 0}
                </div>
                <div className="stat-lbl">
                  Occupancy ({summary?.occupancy_rate_percent ?? 0}%)
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <div className="stat-val">{summary?.pending_issues_count ?? 0}</div>
                <div className="stat-lbl">Pending Maintenance Tickets</div>
              </div>
            </div>
          </>
        )}

        {/* Financial Metrics (Admin & Warden) */}
        {(role === 'admin' || role === 'warden') && (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                <Receipt size={24} />
              </div>
              <div>
                <div className="stat-val">₹{summary?.total_dues_outstanding?.toFixed(2) ?? '0.00'}</div>
                <div className="stat-lbl">Outstanding Dues</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="stat-val">₹{summary?.total_collected?.toFixed(2) ?? '0.00'}</div>
                <div className="stat-lbl">Total Payments Collected</div>
              </div>
            </div>
          </>
        )}

        {/* Notices & Events */}
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
            <Bell size={24} />
          </div>
          <div>
            <div className="stat-val">{summary?.active_notices_count ?? 0}</div>
            <div className="stat-lbl">Active Notices</div>
          </div>
        </div>

        {/* Leave & Outpass Requests for Warden & Admin */}
        {(role === 'admin' || role === 'warden') && (
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'rgba(147, 51, 234, 0.12)', color: '#9333ea' }}>
              <FileText size={24} />
            </div>
            <div>
              <div className="stat-val">{requestStats?.pending ?? 0}</div>
              <div className="stat-lbl">Pending Leave/Outpass</div>
            </div>
          </div>
        )}
      </div>

      {/* Direct Module Navigation */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '16px' }}>
          Authorized Operations & Quick Links
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {role === 'admin' && (
            <>
              <button onClick={() => onNavigate('users')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>User & Role Admin</span>
                <ShieldCheck size={16} />
              </button>
              <button onClick={() => onNavigate('rooms')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Manage Rooms & Rates</span>
                <BedDouble size={16} />
              </button>
              <button onClick={() => onNavigate('fees')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>View Fee Status (Read-Only)</span>
                <Receipt size={16} />
              </button>
              <button onClick={() => onNavigate('attendance')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Attendance Oversight</span>
                <CalendarCheck size={16} />
              </button>
              <button onClick={() => onNavigate('leave_outpass')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Leave & Outpass Oversight</span>
                <FileText size={16} />
              </button>
              <button onClick={() => onNavigate('mess_inventory')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Mess Inventory (Read-Only)</span>
                <Package size={16} />
              </button>
              <button onClick={() => onNavigate('map')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Campus Activity & Presence Map</span>
                <MapPin size={16} />
              </button>
            </>
          )}

          {role === 'warden' && (
            <>
              <button onClick={() => onNavigate('map')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Campus Activity & Presence Map</span>
                <MapPin size={16} />
              </button>
              <button onClick={() => onNavigate('attendance')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Mark Student Attendance</span>
                <CalendarCheck size={16} />
              </button>
              <button onClick={() => onNavigate('fees')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Hostel Fee Register & Collections</span>
                <Receipt size={16} />
              </button>
              <button onClick={() => onNavigate('leave_outpass')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Review Leave & Outpasses</span>
                <FileText size={16} />
              </button>
              <button onClick={() => onNavigate('mess_inventory')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Manage Mess Stock</span>
                <Package size={16} />
              </button>
              <button onClick={() => onNavigate('students')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Student Directory</span>
                <Users size={16} />
              </button>
              <button onClick={() => onNavigate('rooms')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Allocate Room Beds</span>
                <BedDouble size={16} />
              </button>
              <button onClick={() => onNavigate('issues')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Review Maintenance Issues</span>
                <AlertCircle size={16} />
              </button>
              <button onClick={() => onNavigate('notices')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                <span>Publish Announcement</span>
                <Bell size={16} />
              </button>
            </>
          )}

          <button onClick={() => onNavigate('calendar')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span>Hostel Calendar & Deadlines</span>
            <Calendar size={16} />
          </button>
          <button onClick={() => onNavigate('settings')} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
            <span>Usability & Preferences</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
