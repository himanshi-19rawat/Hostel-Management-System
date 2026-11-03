import React, { useEffect, useState } from 'react';
import { AlertCircle, Plus, CheckCircle, Clock, Wrench, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IssueRequest } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Issues: React.FC = () => {
  const { role } = useAuth();
  const [issues, setIssues] = useState<IssueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Submit Issue Modal (Student)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    category: 'cleanliness',
    title: '',
    description: '',
    priority: 'medium',
  });

  // Resolve / Status Update Modal (Warden / Admin)
  const [selectedIssue, setSelectedIssue] = useState<IssueRequest | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: 'in_progress',
    resolution_remarks: '',
  });

  const loadIssues = async () => {
    setLoading(true);
    try {
      const list = await api.getIssues(statusFilter || undefined, categoryFilter || undefined);
      setIssues(list);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load issues' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter, categoryFilter]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.title.trim()) {
      showFeedback('error', 'Please enter a title for the issue.');
      return;
    }
    if (!issueForm.description.trim()) {
      showFeedback('error', 'Please provide a detailed description of the maintenance request.');
      return;
    }

    try {
      await api.submitIssue({
        category: issueForm.category || 'cleanliness',
        title: issueForm.title.trim(),
        description: issueForm.description.trim(),
        priority: issueForm.priority || 'medium',
      });
      showFeedback('success', 'Maintenance request submitted successfully.');
      setIsSubmitOpen(false);
      setIssueForm({
        category: 'cleanliness',
        title: '',
        description: '',
        priority: 'medium',
      });
      await loadIssues();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to submit issue');
    }
  };

  const handleOpenStatusModal = (issue: IssueRequest) => {
    setSelectedIssue(issue);
    setStatusForm({
      status: issue.status === 'open' ? 'in_progress' : issue.status,
      resolution_remarks: issue.resolution_remarks || '',
    });
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    try {
      await api.updateIssueStatus(selectedIssue.id, statusForm.status, statusForm.resolution_remarks);
      showFeedback('success', 'Ticket status updated.');
      setSelectedIssue(null);
      await loadIssues();
    } catch (err: any) {
      showFeedback('error', err.message || 'Status update failed');
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return 'badge-warning';
      case 'in_progress':
        return 'badge-info';
      case 'resolved':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  const isStudent = role === 'student';
  const canManage = role === 'admin' || role === 'warden';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {isStudent ? 'My Issue & Maintenance Requests' : 'Student Maintenance Requests'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isStudent
              ? 'Report plumbing, electrical, room cleanliness, or facility problems directly to the warden.'
              : 'Review and resolve student reported maintenance and room issues.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ width: '150px', fontSize: '0.875rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          {isStudent && (
            <button onClick={() => setIsSubmitOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Report Issue</span>
            </button>
          )}
        </div>
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
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Issues Table */}
      {issues.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No Maintenance Requests Found"
          description={
            isStudent
              ? 'You have not submitted any maintenance requests. Need help with room plumbing, electricals, or cleanliness? Use "Report Issue" above.'
              : 'No maintenance issues have been reported by student residents.'
          }
          actionText={isStudent ? 'Report Issue' : undefined}
          onAction={() => setIsSubmitOpen(true)}
          canAction={isStudent}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                {!isStudent && <th>Student Resident</th>}
                <th>Room</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported On</th>
                <th>Resolution Remarks</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>#{i.id}</td>
                  {!isStudent && <td style={{ fontWeight: 600 }}>{i.student_name}</td>}
                  <td>{i.room_number}</td>
                  <td style={{ textTransform: 'capitalize' }}>{i.category.replace('_', ' ')}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{i.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '300px' }}>
                      {i.description}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        i.priority === 'high' ? 'badge-danger' : i.priority === 'medium' ? 'badge-warning' : 'badge-info'
                      }`}
                    >
                      {i.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(i.status)}`}>
                      {i.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {i.resolution_remarks || '—'}
                  </td>
                  {canManage && (
                    <td>
                      <button
                        onClick={() => handleOpenStatusModal(i)}
                        className="btn btn-secondary btn-sm"
                        title="Update ticket status"
                      >
                        <MessageSquare size={14} />
                        <span>Update</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Issue Modal (Student) */}
      <Modal
        isOpen={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title="Submit Maintenance Request"
        footer={
          <>
            <button type="button" onClick={() => setIsSubmitOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="submit-issue-form" type="submit" className="btn btn-primary">
              Submit Ticket
            </button>
          </>
        }
      >
        <form id="submit-issue-form" onSubmit={handleSubmitIssue}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={issueForm.category}
                required
                onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
              >
                <option value="">Select issue category</option>
                <option value="plumbing">Plumbing (Tap, Leak, Washroom)</option>
                <option value="electrical">Electrical (Light, Fan, Socket)</option>
                <option value="carpentry">Carpentry (Bed, Cupboard, Door)</option>
                <option value="cleanliness">Room / Corridor Cleanliness</option>
                <option value="room_change">Room Change Request</option>
                <option value="other">Other Facility Issue</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={issueForm.priority}
                required
                onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
              >
                <option value="">Select priority</option>
                <option value="low">Low (General)</option>
                <option value="medium">Medium (Moderate)</option>
                <option value="high">High (Urgent Attention)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Issue Subject</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter a short summary of the issue"
              value={issueForm.title}
              onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Detailed Description</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Please describe the exact location and problem in your room..."
              value={issueForm.description}
              onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Update Issue Status Modal (Warden & Admin) */}
      <Modal
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title={`Update Ticket #${selectedIssue?.id} (${selectedIssue?.title})`}
        footer={
          <>
            <button type="button" onClick={() => setSelectedIssue(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="update-issue-form" type="submit" className="btn btn-primary">
              Save Status
            </button>
          </>
        }
      >
        <form id="update-issue-form" onSubmit={handleUpdateStatus}>
          <div className="form-group">
            <label className="form-label">Ticket Status</label>
            <select
              className="form-select"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              <option value="open">Open (Awaiting Inspection)</option>
              <option value="in_progress">In Progress (Worker Assigned)</option>
              <option value="resolved">Resolved (Work Completed)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Resolution Remarks / Notes for Student</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Enter the action taken or resolution notes"
              value={statusForm.resolution_remarks}
              onChange={(e) => setStatusForm({ ...statusForm, resolution_remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
