import React, { useEffect, useState } from 'react';
import { Bell, Plus, Pin, Trash2, Search, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Notice } from '../types';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';

export const Notices: React.FC = () => {
  const { role } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Notice Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    target_role: 'all',
    priority: 'normal',
    is_pinned: false,
  });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const list = await api.getNotices(search || undefined);
      setNotices(list);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load notices' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [search]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      showFeedback('error', 'Please provide both notice title and content.');
      return;
    }

    try {
      await api.createNotice({
        title: noticeForm.title.trim(),
        content: noticeForm.content.trim(),
        target_role: noticeForm.target_role || 'all',
        priority: noticeForm.priority || 'normal',
        is_pinned: noticeForm.is_pinned,
      });
      showFeedback('success', 'Notice published successfully.');
      setIsAddOpen(false);
      setNoticeForm({
        title: '',
        content: '',
        target_role: 'all',
        priority: 'normal',
        is_pinned: false,
      });
      await loadNotices();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to publish notice');
    }
  };

  const handleDeleteNotice = async (id: number) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await api.deleteNotice(id);
      showFeedback('success', 'Notice deleted.');
      await loadNotices();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete notice');
    }
  };

  const canPublish = role === 'admin' || role === 'warden';

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'badge-danger';
      case 'high':
        return 'badge-warning';
      case 'low':
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel Notice Board</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Official announcements, rules updates, and residential circulars.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '34px', fontSize: '0.875rem' }}
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          {canPublish && (
            <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Publish Notice</span>
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

      {/* Notice Cards */}
      {notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notices Available"
          description="There are currently no active announcements on the hostel notice board."
          actionText={canPublish ? 'Publish First Notice' : undefined}
          onAction={() => setIsAddOpen(true)}
          canAction={canPublish}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {notices.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                borderLeft: n.is_pinned ? '4px solid var(--accent-primary)' : '1px solid var(--border-color)',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {n.is_pinned && (
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Pin size={12} /> Pinned
                      </span>
                    )}
                    <span className={`badge ${getPriorityBadge(n.priority)}`}>
                      {n.priority}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Audience: {n.target_role.toUpperCase()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {n.title}
                  </h3>
                </div>

                {canPublish && (
                  <button
                    onClick={() => handleDeleteNotice(n.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--danger)', padding: '6px' }}
                    title="Delete notice"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <p style={{ marginTop: '12px', fontSize: '0.925rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {n.content}
              </p>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Published by: <strong>{n.author_name}</strong></span>
                <span>{new Date(n.published_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Notice Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Publish Official Notice"
        footer={
          <>
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button form="publish-notice-form" type="submit" className="btn btn-primary">
              Post Announcement
            </button>
          </>
        }
      >
        <form id="publish-notice-form" onSubmit={handleCreateNotice}>
          <div className="form-group">
            <label className="form-label">Notice Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the notice title"
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                className="form-select"
                value={noticeForm.target_role}
                required
                onChange={(e) => setNoticeForm({ ...noticeForm, target_role: e.target.value })}
              >
                <option value="">Select audience</option>
                <option value="all">All Hostel Residents & Staff</option>
                <option value="student">Students Only</option>
                <option value="warden">Wardens Only</option>
                <option value="accounts_staff">Accounts Staff Only</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={noticeForm.priority}
                required
                onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
              >
                <option value="">Select priority</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content / Body</label>
            <textarea
              className="form-textarea"
              rows={5}
              placeholder="Write the full announcement text..."
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              required
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <input
              type="checkbox"
              id="pin-notice"
              checked={noticeForm.is_pinned}
              onChange={(e) => setNoticeForm({ ...noticeForm, is_pinned: e.target.checked })}
            />
            <label htmlFor="pin-notice" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
              Pin this notice to the top of the board
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};
