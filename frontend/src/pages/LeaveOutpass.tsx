import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Send,
  ShieldCheck,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudentRequest, RequestStats } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const LeaveOutpass: React.FC = () => {
  const { role, user } = useAuth();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isOutpassModalOpen, setIsOutpassModalOpen] = useState<boolean>(false);

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Outpass Form
  const [outpassForm, setOutpassForm] = useState({
    date: '',
    start_time: '17:00',
    end_time: '21:00',
    reason: '',
  });

  // Warden Review Modal
  const [reviewRequest, setReviewRequest] = useState<StudentRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [decisionRemarks, setDecisionRemarks] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, statData] = await Promise.all([
        api.getRequests(typeFilter || undefined, statusFilter || undefined),
        api.getRequestStats(),
      ]);
      setRequests(reqList);
      setStats(statData);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter, role]);

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason.trim()) {
      showFeedback('error', 'Please provide start date, end date, and reason.');
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      showFeedback('error', 'End date cannot be earlier than start date.');
      return;
    }

    try {
      await api.createRequest({
        request_type: 'leave',
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason.trim(),
      });
      showFeedback('success', 'Leave request submitted successfully for Warden approval.');
      setIsLeaveModalOpen(false);
      setLeaveForm({ start_date: '', end_date: '', reason: '' });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to submit leave request');
    }
  };

  // Submit Outpass Request
  const handleSubmitOutpass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outpassForm.date || !outpassForm.reason.trim()) {
      showFeedback('error', 'Please provide date and reason.');
      return;
    }

    try {
      await api.createRequest({
        request_type: 'outpass',
        start_date: outpassForm.date,
        end_date: outpassForm.date,
        start_time: outpassForm.start_time,
        end_time: outpassForm.end_time,
        reason: outpassForm.reason.trim(),
      });
      showFeedback('success', 'Outpass request submitted successfully for Warden approval.');
      setIsOutpassModalOpen(false);
      setOutpassForm({ date: '', start_time: '17:00', end_time: '21:00', reason: '' });
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to submit outpass request');
    }
  };

  // Student Cancel Request
  const handleCancelRequest = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;
    try {
      await api.cancelRequest(id);
      showFeedback('success', 'Request cancelled successfully.');
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to cancel request');
    }
  };

  // Warden Review Submit
  const handleOpenReview = (req: StudentRequest) => {
    setReviewRequest(req);
    setReviewDecision('approved');
    setDecisionRemarks('');
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewRequest) return;
    setSubmittingReview(true);
    try {
      await api.updateRequestStatus(reviewRequest.id, {
        status: reviewDecision,
        decision_remarks: decisionRemarks.trim() || undefined,
      });
      showFeedback('success', `Request marked as ${reviewDecision.toUpperCase()}.`);
      setReviewRequest(null);
      await loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update request status');
    } finally {
      setSubmittingReview(false);
    }
  };

  const isStudent = role === 'student';
  const isWarden = role === 'warden';
  const isAdmin = role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {isStudent
                ? 'My Leave & Outpass Requests'
                : isWarden
                ? 'Student Leave & Outpass Review Console'
                : 'Leave & Outpass Requests Oversight (Read-Only)'}
            </h2>
            {isAdmin && (
              <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Read-Only Oversight
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isStudent
              ? 'Submit separate requests for overnight Leave or day Outpass. Track review decisions and Warden remarks.'
              : 'Review and approve/reject resident student leave and outpass applications with official decision notes.'}
          </p>
        </div>

        {isStudent && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Apply for Leave</span>
            </button>
            <button
              onClick={() => setIsOutpassModalOpen(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={16} />
              <span>Apply for Outpass</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-val">{stats?.pending ?? 0}</div>
            <div className="stat-lbl">Pending Review</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-val">{stats?.approved ?? 0}</div>
            <div className="stat-lbl">Approved Requests</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div className="stat-val">{stats?.rejected ?? 0}</div>
            <div className="stat-lbl">Rejected Requests</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-val">{stats?.total ?? 0}</div>
            <div className="stat-lbl">Total Submitted</div>
          </div>
        </div>
      </div>

      {/* Feedback Message */}
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
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          className="form-select"
          style={{ width: '160px', fontSize: '0.875rem' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="leave">Leave Only</option>
          <option value="outpass">Outpass Only</option>
        </select>

        <select
          className="form-select"
          style={{ width: '160px', fontSize: '0.875rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Requests Found"
          description={
            isStudent
              ? "You have not submitted any Leave or Outpass requests yet. Use 'Apply for Leave' or 'Apply for Outpass' above."
              : 'There are no student leave or outpass requests matching the criteria.'
          }
          actionText={isStudent ? 'Apply for First Leave' : undefined}
          onAction={() => setIsLeaveModalOpen(true)}
          canAction={isStudent}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {!isStudent && <th>Student</th>}
                <th>Request Type</th>
                <th>Dates / Timing</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Warden Remarks</th>
                <th>Submitted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  {!isStudent && (
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                      {r.room_number && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.room_number}</div>
                      )}
                    </td>
                  )}
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: r.request_type === 'leave' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(147, 51, 234, 0.15)',
                        color: r.request_type === 'leave' ? 'var(--accent-primary)' : '#9333ea',
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {r.request_type}
                    </span>
                  </td>
                  <td>
                    {r.request_type === 'leave' ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {r.start_date} → {r.end_date}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.start_date}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {r.start_time || 'Out'} — {r.end_time || 'In'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: '240px', fontSize: '0.875rem' }}>{r.reason}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'approved'
                          ? 'badge-success'
                          : r.status === 'rejected'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: r.decision_remarks ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {r.decision_remarks || '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {isWarden && r.status === 'pending' && (
                      <button
                        onClick={() => handleOpenReview(r)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Check size={14} />
                        <span>Decide</span>
                      </button>
                    )}
                    {isStudent && r.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(r.id)}
                        className="btn btn-danger btn-sm"
                        title="Cancel pending request"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={14} />
                        <span>Cancel</span>
                      </button>
                    )}
                    {(r.status !== 'pending' || isAdmin) && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Application Modal (Student) */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Apply for Student Leave"
      >
        <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            For multi-day absence from hostel premises (holidays, family events, medical reasons).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Leave From Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Leave To Date *</label>
              <input
                type="date"
                required
                className="form-control"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              className="form-control"
              placeholder="State clear purpose (e.g. visiting home for festival, fever rest)..."
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              <span>Submit Leave Request</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Outpass Application Modal (Student) */}
      <Modal
        isOpen={isOutpassModalOpen}
        onClose={() => setIsOutpassModalOpen(false)}
        title="Apply for Day Outpass"
      >
        <form onSubmit={handleSubmitOutpass} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            For same-day excursion, tuition, or campus errands returning before curfew.
          </p>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              required
              className="form-control"
              value={outpassForm.date}
              onChange={(e) => setOutpassForm({ ...outpassForm, date: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Expected Out Time *</label>
              <input
                type="time"
                required
                className="form-control"
                value={outpassForm.start_time}
                onChange={(e) => setOutpassForm({ ...outpassForm, start_time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Return Time *</label>
              <input
                type="time"
                required
                className="form-control"
                value={outpassForm.end_time}
                onChange={(e) => setOutpassForm({ ...outpassForm, end_time: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Outpass *</label>
            <textarea
              required
              rows={3}
              className="form-control"
              placeholder="State purpose of excursion (e.g. library study, stationery purchase, medical checkup)..."
              value={outpassForm.reason}
              onChange={(e) => setOutpassForm({ ...outpassForm, reason: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsOutpassModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              <span>Submit Outpass Request</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Warden Review & Decision Modal */}
      {reviewRequest && (
        <Modal
          isOpen={!!reviewRequest}
          onClose={() => setReviewRequest(null)}
          title={`Review ${reviewRequest.request_type.toUpperCase()} Request`}
        >
          <form onSubmit={handleSaveDecision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Student:</span>
                <span>{reviewRequest.student_name}</span>
              </div>
              {reviewRequest.room_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Room:</span>
                  <span>{reviewRequest.room_number}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>Timing:</span>
                <span>
                  {reviewRequest.request_type === 'leave'
                    ? `${reviewRequest.start_date} → ${reviewRequest.end_date}`
                    : `${reviewRequest.start_date} (${reviewRequest.start_time} - ${reviewRequest.end_time})`}
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>Reason: </span>
                <span>{reviewRequest.reason}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Decision *</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="approved"
                    checked={reviewDecision === 'approved'}
                    onChange={() => setReviewDecision('approved')}
                  />
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>Approve Request</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="rejected"
                    checked={reviewDecision === 'rejected'}
                    onChange={() => setReviewDecision('rejected')}
                  />
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Reject Request</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Decision Remarks / Instructions</label>
              <textarea
                rows={2}
                className="form-control"
                placeholder="Optional decision note (e.g. 'Granted, report to gate by 9 PM', 'Parent confirmation verified')..."
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="btn btn-secondary"
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className={`btn ${reviewDecision === 'approved' ? 'btn-primary' : 'btn-danger'}`}
              >
                {reviewDecision === 'approved' ? <Check size={16} /> : <X size={16} />}
                <span>{submittingReview ? 'Saving...' : `Confirm ${reviewDecision === 'approved' ? 'Approval' : 'Rejection'}`}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
