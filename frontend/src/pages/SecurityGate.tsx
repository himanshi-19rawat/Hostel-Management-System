import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, Search, QrCode, LogOut, LogIn, Clock, AlertTriangle, 
  CheckCircle2, XCircle, Plus, FileText, UserCheck, Calendar, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GatePass, StudentProfile } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';

export const SecurityGate: React.FC = () => {
  const { role, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'verify' | 'outside' | 'overdue' | 'all'>('verify');
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search / Quick Scan State
  const [searchCode, setSearchCode] = useState('');
  const [verifiedPass, setVerifiedPass] = useState<GatePass | null>(null);

  // Request Pass Modal State (for students or wardens)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [passForm, setPassForm] = useState({
    student_id: 0,
    reason: '',
    destination: '',
    departure_date: new Date().toISOString().split('T')[0],
    departure_time: '14:00',
    expected_return_date: new Date().toISOString().split('T')[0],
    expected_return_time: '20:00',
    emergency_contact: '',
  });

  // Rejection Modal State
  const [rejectModalPass, setRejectModalPass] = useState<GatePass | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadPasses = async () => {
    setLoading(true);
    try {
      const data = await api.getGatePasses();
      setGatePasses(data);
      if (role === 'admin' || role === 'warden') {
        const studentList = await api.getStudents();
        setStudents(studentList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load gate passes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPasses();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSearchPass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchCode.trim()) {
      showFeedback('error', 'Please enter a gate pass reference number or scan a QR code.');
      return;
    }
    try {
      const pass = await api.verifyGatePassCode(searchCode.trim());
      setVerifiedPass(pass);
      showFeedback('success', `Gate pass verified for ${pass.student_name || 'student'}`);
    } catch (err: any) {
      setVerifiedPass(null);
      showFeedback('error', err.message || 'Pass not found or invalid reference');
    }
  };

  const handleRecordExit = async (passId: number) => {
    try {
      const updated = await api.recordGateExit(passId);
      showFeedback('success', `Departure recorded for ${updated.student_name}. Status: Outside Hostel.`);
      setVerifiedPass(updated);
      await loadPasses();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to record exit');
    }
  };

  const handleRecordEntry = async (passId: number) => {
    try {
      const updated = await api.recordGateEntry(passId);
      const lateNote = updated.is_late ? ' (LATE RETURN FLAGGED)' : '';
      showFeedback('success', `Return entry recorded for ${updated.student_name}${lateNote}. Status: Present in Hostel.`);
      setVerifiedPass(updated);
      await loadPasses();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to record return entry');
    }
  };

  const handleReview = async (passId: number, status: 'approved' | 'rejected') => {
    try {
      await api.reviewGatePass(passId, status, status === 'rejected' ? rejectionReason : undefined);
      showFeedback('success', `Gate pass ${status} successfully.`);
      setRejectModalPass(null);
      setRejectionReason('');
      await loadPasses();
    } catch (err: any) {
      showFeedback('error', err.message || `Failed to ${status} gate pass`);
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passForm.reason.trim() || !passForm.destination.trim()) {
      showFeedback('error', 'Please enter destination and reason.');
      return;
    }
    try {
      const newPass = await api.createGatePass(passForm);
      showFeedback('success', `Gate pass requested successfully (Pass Ref: ${newPass.pass_number || 'Pending Approval'}).`);
      setIsRequestModalOpen(false);
      setPassForm({
        student_id: 0,
        reason: '',
        destination: '',
        departure_date: new Date().toISOString().split('T')[0],
        departure_time: '14:00',
        expected_return_date: new Date().toISOString().split('T')[0],
        expected_return_time: '20:00',
        emergency_contact: '',
      });
      await loadPasses();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to submit gate pass request');
    }
  };

  const overdueList = gatePasses.filter((p) => p.status === 'overdue' || (p.is_late && p.status !== 'completed'));
  const outsideList = gatePasses.filter((p) => p.actual_exit_time && !p.actual_return_time);

  const canApprove = role === 'admin' || role === 'warden';
  const canRecordGate = role === 'admin' || role === 'warden' || role === 'staff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--accent-primary)' }} />
            Security Guard & Gate Pass Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Physical entry/exit logging, digital pass verification, QR validation, and overdue student alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(role === 'student' || canApprove) && (
            <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Request Gate Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('verify')}
          className={`btn btn-sm ${activeTab === 'verify' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Search size={14} style={{ marginRight: '4px' }} />
          Gate Verification
        </button>
        <button
          onClick={() => setActiveTab('outside')}
          className={`btn btn-sm ${activeTab === 'outside' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <LogOut size={14} style={{ marginRight: '4px' }} />
          Currently Outside ({outsideList.length})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`btn btn-sm ${activeTab === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
          style={overdueList.length > 0 ? { color: 'var(--danger)', fontWeight: 700 } : {}}
        >
          <AlertTriangle size={14} style={{ marginRight: '4px' }} />
          Overdue Returns ({overdueList.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <FileText size={14} style={{ marginRight: '4px' }} />
          All Gate Passes ({gatePasses.length})
        </button>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: VERIFICATION & QUICK SCAN */}
      {activeTab === 'verify' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Lookup Panel */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <QrCode size={18} style={{ color: 'var(--accent-primary)' }} />
              Quick Pass Verification
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Enter or scan the student's unique Gate Pass reference number (e.g. <code>GP-20261103-0001</code>) to verify authorization and log movement.
            </p>

            <form onSubmit={handleSearchPass} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter GP-YYYYMMDD-XXXX"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                style={{ fontFamily: 'monospace' }}
              />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Search size={16} />
                <span>Verify</span>
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Recent Approved Gate Passes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {gatePasses
                  .filter((p) => p.status === 'approved' || p.status === 'overdue')
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setVerifiedPass(p)}
                      style={{
                        padding: '10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: verifiedPass?.id === p.id ? 'var(--accent-subtle, rgba(59,130,246,0.1))' : 'var(--bg-card)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.pass_number} • Room {p.room_number || 'N/A'}
                        </div>
                      </div>
                      <span className={`badge ${p.status === 'approved' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Verification Result Card */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Gate Pass Authorization Card</h3>
            {verifiedPass ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header Banner */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: verifiedPass.status === 'approved' 
                      ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.2))'
                      : verifiedPass.status === 'overdue'
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.2))'
                      : 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(71,85,105,0.2))',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Official Gate Pass
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace' }}>
                      {verifiedPass.pass_number}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      verifiedPass.status === 'approved'
                        ? 'badge-success'
                        : verifiedPass.status === 'overdue'
                        ? 'badge-danger'
                        : 'badge-info'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                  >
                    {verifiedPass.status.toUpperCase()}
                  </span>
                </div>

                {/* Student Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student Name</span>
                    <p style={{ fontWeight: 600, margin: 0 }}>{verifiedPass.student_name}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll / Reg Number</span>
                    <p style={{ fontWeight: 600, margin: 0 }}>{verifiedPass.student_roll || '—'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room & Block</span>
                    <p style={{ fontWeight: 600, margin: 0 }}>{verifiedPass.room_number ? `Room ${verifiedPass.room_number} (${verifiedPass.hostel_block || ''})` : 'Unassigned'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destination</span>
                    <p style={{ fontWeight: 600, margin: 0 }}>{verifiedPass.destination}</p>
                  </div>
                </div>

                {/* Timing Details */}
                <div style={{ background: 'var(--bg-muted)', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Departure:</span>
                    <span style={{ fontWeight: 600 }}>{verifiedPass.departure_date} at {verifiedPass.departure_time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expected Return:</span>
                    <span style={{ fontWeight: 600, color: verifiedPass.is_late ? 'var(--danger)' : 'inherit' }}>
                      {verifiedPass.expected_return_date} at {verifiedPass.expected_return_time}
                    </span>
                  </div>
                  {verifiedPass.actual_exit_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Physical Exit Recorded:</span>
                      <span>{new Date(verifiedPass.actual_exit_time).toLocaleTimeString()}</span>
                    </div>
                  )}
                  {verifiedPass.actual_return_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Physical Return Recorded:</span>
                      <span>{new Date(verifiedPass.actual_return_time).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                {/* 1-Click Action Buttons for Security Staff */}
                {canRecordGate && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    {!verifiedPass.actual_exit_time && verifiedPass.status === 'approved' && (
                      <button
                        onClick={() => handleRecordExit(verifiedPass.id)}
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <LogOut size={16} />
                        <span>Log Physical Exit</span>
                      </button>
                    )}

                    {verifiedPass.actual_exit_time && !verifiedPass.actual_return_time && (
                      <button
                        onClick={() => handleRecordEntry(verifiedPass.id)}
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <LogIn size={16} />
                        <span>Log Physical Return</span>
                      </button>
                    )}

                    {verifiedPass.status === 'completed' && (
                      <div style={{ width: '100%', textAlign: 'center', padding: '10px', color: 'var(--success)', fontWeight: 600, background: 'var(--success-bg)', borderRadius: '6px' }}>
                        Gate Pass Completed & Closed
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No Gate Pass Selected"
                description="Search for a gate pass number or pick one from the list on the left to verify credentials and record gate entry/exit."
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CURRENTLY OUTSIDE */}
      {activeTab === 'outside' && (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pass Ref</th>
                <th>Student</th>
                <th>Room</th>
                <th>Destination</th>
                <th>Departed At</th>
                <th>Expected Return</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outsideList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No students are currently recorded outside the campus.
                  </td>
                </tr>
              ) : (
                outsideList.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.pass_number}</td>
                    <td style={{ fontWeight: 600 }}>{p.student_name}</td>
                    <td>{p.room_number ? `Room ${p.room_number}` : '—'}</td>
                    <td>{p.destination}</td>
                    <td>{p.actual_exit_time ? new Date(p.actual_exit_time).toLocaleTimeString() : '—'}</td>
                    <td style={{ color: p.is_late ? 'var(--danger)' : 'inherit', fontWeight: p.is_late ? 700 : 400 }}>
                      {p.expected_return_date} {p.expected_return_time}
                    </td>
                    <td>
                      {canRecordGate && (
                        <button
                          onClick={() => handleRecordEntry(p.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <LogIn size={14} />
                          <span>Record Entry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: OVERDUE RETURNS */}
      {activeTab === 'overdue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px 16px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fca5a5)', borderRadius: '8px', color: 'var(--danger, #dc2626)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} />
            <div>
              <div style={{ fontWeight: 700 }}>Security Overdue Alert</div>
              <div style={{ fontSize: '0.85rem' }}>The following students have exceeded their expected return time and have not logged a campus re-entry.</div>
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pass Ref</th>
                  <th>Student Name</th>
                  <th>Room</th>
                  <th>Emergency Contact</th>
                  <th>Destination</th>
                  <th>Expected Return</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      🎉 Zero overdue returns! All students have returned on time.
                    </td>
                  </tr>
                ) : (
                  overdueList.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--danger)' }}>{p.pass_number}</td>
                      <td style={{ fontWeight: 700 }}>{p.student_name}</td>
                      <td>{p.room_number ? `Room ${p.room_number}` : '—'}</td>
                      <td>{p.emergency_contact || 'None listed'}</td>
                      <td>{p.destination}</td>
                      <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                        {p.expected_return_date} {p.expected_return_time}
                      </td>
                      <td>
                        {canRecordGate && (
                          <button
                            onClick={() => handleRecordEntry(p.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                          >
                            <LogIn size={14} />
                            <span>Late Re-entry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ALL GATE PASSES */}
      {activeTab === 'all' && (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pass Ref</th>
                <th>Student</th>
                <th>Destination</th>
                <th>Departure</th>
                <th>Expected Return</th>
                <th>Status</th>
                <th>Reviewer</th>
                {canApprove && <th>Warden Actions</th>}
              </tr>
            </thead>
            <tbody>
              {gatePasses.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.pass_number || 'Pending'}</td>
                  <td style={{ fontWeight: 600 }}>{p.student_name}</td>
                  <td>{p.destination}</td>
                  <td>{p.departure_date}</td>
                  <td>{p.expected_return_date}</td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === 'approved'
                          ? 'badge-success'
                          : p.status === 'completed'
                          ? 'badge-info'
                          : p.status === 'overdue'
                          ? 'badge-danger'
                          : p.status === 'rejected'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td>{p.approver_name || '—'}</td>
                  {canApprove && (
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleReview(p.id, 'approved')}
                            className="btn btn-primary btn-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectModalPass(p);
                              setRejectionReason('');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Gate Pass Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Hostel Gate Pass"
        footer={
          <>
            <button type="button" onClick={() => setIsRequestModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="gate-pass-form" type="submit" className="btn btn-primary">
              Submit Gate Pass
            </button>
          </>
        }
      >
        <form id="gate-pass-form" onSubmit={handleCreatePass}>
          {canApprove && (
            <div className="form-group">
              <label className="form-label">Student</label>
              <select
                className="form-select"
                value={passForm.student_id}
                onChange={(e) => setPassForm({ ...passForm, student_id: parseInt(e.target.value) })}
                required
              >
                <option value={0}>-- Select Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Destination</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. City Hospital, Home, Railway Station"
              value={passForm.destination}
              onChange={(e) => setPassForm({ ...passForm, destination: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Leaving</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Medical appointment, family emergency, academic project visit"
              value={passForm.reason}
              onChange={(e) => setPassForm({ ...passForm, reason: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Departure Date</label>
              <input
                type="date"
                className="form-input"
                value={passForm.departure_date}
                onChange={(e) => setPassForm({ ...passForm, departure_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <input
                type="time"
                className="form-input"
                value={passForm.departure_time}
                onChange={(e) => setPassForm({ ...passForm, departure_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Expected Return Date</label>
              <input
                type="date"
                className="form-input"
                value={passForm.expected_return_date}
                onChange={(e) => setPassForm({ ...passForm, expected_return_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Return Time</label>
              <input
                type="time"
                className="form-input"
                value={passForm.expected_return_time}
                onChange={(e) => setPassForm({ ...passForm, expected_return_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Emergency Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+91 98765 43210"
              value={passForm.emergency_contact}
              onChange={(e) => setPassForm({ ...passForm, emergency_contact: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectModalPass)}
        onClose={() => setRejectModalPass(null)}
        title="Reject Gate Pass"
        footer={
          <>
            <button type="button" onClick={() => setRejectModalPass(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => rejectModalPass && handleReview(rejectModalPass.id, 'rejected')}
              className="btn btn-secondary"
              style={{ color: 'var(--danger)' }}
            >
              Confirm Rejection
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.875rem', marginBottom: '12px' }}>
          Provide a reason for rejecting the gate pass for <strong>{rejectModalPass?.student_name}</strong>:
        </p>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="e.g. Incomplete emergency contact, hostel inspection scheduled"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};
