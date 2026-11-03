import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  AlertCircle,
  ShieldCheck,
  Users,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentAttendance, AttendanceSummary, StudentProfile } from '../types';
import { EmptyState } from '../components/EmptyState';

export const Attendance: React.FC = () => {
  const { role, user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  // Warden & Admin state
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [dateRecords, setDateRecords] = useState<StudentAttendance[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, { status: 'present' | 'absent'; remarks: string }>>({});
  const [hasExistingRecords, setHasExistingRecords] = useState<boolean>(false);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Student state
  const [myRecords, setMyRecords] = useState<StudentAttendance[]>([]);
  const [mySummary, setMySummary] = useState<AttendanceSummary | null>(null);

  // Common state
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Load data depending on role
  const loadData = async () => {
    setLoading(true);
    try {
      if (role === 'student') {
        const [records, sum] = await Promise.all([
          api.getAttendance(),
          api.getAttendanceSummary(),
        ]);
        setMyRecords(records);
        setMySummary(sum);
      } else if (role === 'warden' || role === 'admin') {
        const studentList = await api.getStudents();
        setStudents(studentList);

        const recs = await api.getAttendance(selectedDate);
        setDateRecords(recs);
        setHasExistingRecords(recs.length > 0);

        // Map existing or default attendance
        const map: Record<number, { status: 'present' | 'absent'; remarks: string }> = {};
        studentList.forEach((s) => {
          const found = recs.find((r) => r.student_id === s.id);
          if (found) {
            map[s.id] = { status: found.status, remarks: found.remarks || '' };
          } else {
            map[s.id] = { status: 'present', remarks: '' };
          }
        });
        setAttendanceState(map);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role, selectedDate]);

  // Warden handlers
  const handleStatusChange = (studentId: number, status: 'present' | 'absent') => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: number, remarks: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    setAttendanceState((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = { ...next[s.id], status };
      });
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (role !== 'warden') return;
    setSaving(true);
    try {
      const recordsToSave = students.map((s) => ({
        student_id: s.id,
        status: attendanceState[s.id]?.status || 'present',
        remarks: attendanceState[s.id]?.remarks || undefined,
      }));

      await api.markAttendance({
        date: selectedDate,
        records: recordsToSave,
      });

      showFeedback(
        'success',
        hasExistingRecords
          ? `Authorized correction applied and saved for ${selectedDate}.`
          : `Attendance saved successfully for ${selectedDate} (${recordsToSave.length} students).`
      );
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // --- STUDENT VIEW ---
  if (role === 'student') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Attendance Record</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Official record of your daily hostel attendance and presence status marked by the Warden.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-val">{mySummary?.total_days ?? 0}</div>
              <div className="stat-lbl">Days Marked</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="stat-val">{mySummary?.present_count ?? 0}</div>
              <div className="stat-lbl">Days Present</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <XCircle size={24} />
            </div>
            <div>
              <div className="stat-val">{mySummary?.absent_count ?? 0}</div>
              <div className="stat-lbl">Days Absent</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <CalendarCheck size={24} />
            </div>
            <div>
              <div className="stat-val">
                {mySummary?.attendance_percentage ?? 0}%
              </div>
              <div className="stat-lbl">Attendance Rate</div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading attendance records...
          </div>
        ) : myRecords.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance History"
            description="The warden has not recorded any daily attendance for your account yet. Daily attendance updates will appear here."
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Attendance Status</th>
                  <th>Remarks / Note</th>
                  <th>Marked By</th>
                  <th>Recorded On</th>
                </tr>
              </thead>
              <tbody>
                {myRecords.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.date}</td>
                    <td>
                      <span className={`badge ${r.status === 'present' ? 'badge-success' : 'badge-danger'}`}>
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                    <td>{r.remarks || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {r.marked_by_name || 'Chief Warden'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {new Date(r.updated_at || r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- WARDEN & ADMIN VIEW ---
  const canMarkAttendance = role === 'warden';

  const filteredStudents = selectedStudentFilter
    ? students.filter((s) => s.id === Number(selectedStudentFilter))
    : students;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {role === 'warden' ? 'Student Attendance Register' : 'Attendance Register Oversight (Read-Only)'}
            </h2>
            {role === 'admin' && (
              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Read-Only Oversight
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {role === 'warden'
              ? 'Select a date, mark student Present or Absent, and save. Duplicate entries for the same date are prevented, and authorized corrections can be saved at any time.'
              : 'Administrative read-only oversight of daily student attendance records and logs.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Date:</label>
            <input
              type="date"
              className="form-control"
              style={{ width: '160px', fontSize: '0.875rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Student:</label>
            <select
              className="form-select"
              style={{ width: '170px', fontSize: '0.875rem' }}
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
            >
              <option value="">All Students ({students.length})</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {canMarkAttendance && (
            <button
              onClick={handleSaveAttendance}
              disabled={saving || students.length === 0}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : hasExistingRecords ? 'Save Corrections' : 'Save Attendance'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Info / Alert Banner */}
      {hasExistingRecords && (
        <div
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderColor: 'var(--info)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
          }}
        >
          <AlertCircle size={18} color="var(--info)" />
          <span>
            <strong>Attendance Logged:</strong> Records already exist for <strong>{selectedDate}</strong>.
            {canMarkAttendance && ' You may make authorized corrections to any student and save to update the register.'}
          </span>
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor:
              message.type === 'success' ? 'var(--success-bg)' : message.type === 'error' ? 'var(--danger-bg)' : 'var(--info-bg)',
            color:
              message.type === 'success' ? 'var(--success)' : message.type === 'error' ? 'var(--danger)' : 'var(--info)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Warden Quick Bulk Controls */}
      {canMarkAttendance && students.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Quick select for all {students.length} students:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleMarkAll('present')}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--success)' }}
            >
              <CheckCircle2 size={14} />
              <span>Mark All Present</span>
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--danger)' }}
            >
              <XCircle size={14} />
              <span>Mark All Absent</span>
            </button>
          </div>
        </div>
      )}

      {/* Roster / Attendance Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading student roster for {selectedDate}...
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Students Registered"
          description="There are currently no students registered in the system."
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Registration No</th>
                <th>Current Room</th>
                <th>Status for {selectedDate}</th>
                <th>Remarks / Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const currentStatus = attendanceState[s.id]?.status || 'present';
                const currentRemarks = attendanceState[s.id]?.remarks || '';

                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.full_name}</td>
                    <td>{s.registration_no || '—'}</td>
                    <td>{s.current_room || 'Not Assigned'}</td>
                    <td>
                      {canMarkAttendance ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'present')}
                            className={`btn btn-sm ${currentStatus === 'present' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              backgroundColor: currentStatus === 'present' ? 'var(--success)' : undefined,
                              borderColor: currentStatus === 'present' ? 'var(--success)' : undefined,
                              color: currentStatus === 'present' ? '#fff' : undefined,
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>Present</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'absent')}
                            className={`btn btn-sm ${currentStatus === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                            style={{
                              backgroundColor: currentStatus === 'absent' ? 'var(--danger)' : undefined,
                              borderColor: currentStatus === 'absent' ? 'var(--danger)' : undefined,
                              color: currentStatus === 'absent' ? '#fff' : undefined,
                            }}
                          >
                            <XCircle size={14} />
                            <span>Absent</span>
                          </button>
                        </div>
                      ) : (
                        <span className={`badge ${currentStatus === 'present' ? 'badge-success' : 'badge-danger'}`}>
                          {currentStatus === 'present' ? 'Present' : 'Absent'}
                        </span>
                      )}
                    </td>
                    <td>
                      {canMarkAttendance ? (
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Optional remarks (e.g. sick leave)"
                          value={currentRemarks}
                          onChange={(e) => handleRemarksChange(s.id, e.target.value)}
                          style={{ fontSize: '0.85rem', minWidth: '220px' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: currentRemarks ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {currentRemarks || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
